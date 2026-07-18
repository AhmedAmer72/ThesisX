import type { TradeOrderPlan } from "@/lib/types";
import { keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getSymbolId, requireSymbolId } from "@/lib/sodex/symbols";
import { getExecutionMode, isMockExecutionAllowed } from "@/lib/buildathon";
import { isProductionMode } from "@/lib/production";
import { nextExecutionNonce } from "@/lib/sodex/nonce";
import { isGlobalKillSwitchActive } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { logExecution } from "@/lib/observability";

export type ExecutionMode = "mock" | "testnet" | "mainnet";

export interface ExecutionResult {
  mode: ExecutionMode;
  orders: {
    symbol: string;
    side: string;
    quantity: string;
    status: string;
    externalRef?: string;
    nonce?: string;
    symbolId?: number;
  }[];
  message: string;
}

function getMode(): ExecutionMode {
  return getExecutionMode();
}

function compactPayload(type: string, params: Record<string, unknown>): string {
  const payload = JSON.stringify({ type, params });
  return keccak256(toBytes(payload));
}

function parseOrderResponse(text: string): string | undefined {
  try {
    const json = JSON.parse(text) as {
      orderID?: string;
      clOrdID?: string;
      status?: string;
    };
    return json.orderID ?? json.clOrdID ?? json.status;
  } catch {
    return text.slice(0, 200) || undefined;
  }
}

export async function getAccountId(
  userAddress: string,
  spotBase: string
): Promise<number | null> {
  try {
    const res = await fetch(`${spotBase}/accounts/${userAddress}/state`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { aid?: number };
    return data.aid ?? null;
  } catch {
    return null;
  }
}

export async function executeTradePlan(
  fundId: string,
  orders: TradeOrderPlan[]
): Promise<ExecutionResult> {
  const mode = getMode();

  if (await isGlobalKillSwitchActive()) {
    return {
      mode,
      orders: [],
      message: "Global kill switch active - execution blocked.",
    };
  }

  const fundPolicy = await prisma.riskPolicy.findFirst({
    where: { fundId },
  });
  if (fundPolicy?.killSwitch) {
    return {
      mode,
      orders: [],
      message: "Fund kill switch active - execution blocked.",
    };
  }

  if (mode === "mock") {
    if (!isMockExecutionAllowed()) {
      return {
        mode,
        orders: [],
        message:
          "Mock execution disabled. Set EXECUTION_MODE=testnet and configure SoDEX credentials.",
      };
    }
    const result: ExecutionResult = {
      mode: "mock",
      orders: orders.map((o, i) => ({
        symbol: o.symbol,
        side: o.side,
        quantity: o.quantity,
        status: "filled_simulated",
        externalRef: `mock-${fundId}-${i}-${Date.now()}`,
        symbolId: getSymbolId(o.symbol) ?? undefined,
      })),
      message: "Mock execution — orders filled in paper portfolio.",
    };
    logExecution(fundId, "mock_execution", { count: result.orders.length });
    return result;
  }

  const keyName = process.env.SODEX_API_KEY_NAME;
  const privateKey = process.env.SODEX_API_PRIVATE_KEY as
    | `0x${string}`
    | undefined;
  let accountId = process.env.SODEX_ACCOUNT_ID;
  const userAddress = process.env.SODEX_USER_ADDRESS?.trim();

  if (!keyName || !privateKey) {
    return {
      mode,
      orders: [],
      message:
        "SoDEX API credentials missing. Generate and register an API key in Settings.",
    };
  }

  const spotBaseEarly =
    mode === "testnet"
      ? (process.env.SODEX_SPOT_BASE ??
        "https://testnet-gw.sodex.dev/api/v1/spot")
      : "https://mainnet-gw.sodex.dev/api/v1/spot";

  if (!accountId && userAddress) {
    const resolved = await getAccountId(userAddress, spotBaseEarly);
    if (resolved != null) accountId = String(resolved);
  }

  if (!accountId) {
    return {
      mode,
      orders: [],
      message:
        "SoDEX account ID missing. Set SODEX_ACCOUNT_ID or SODEX_USER_ADDRESS.",
    };
  }

  if (mode === "mainnet" && process.env.ALLOW_MAINNET !== "true") {
    return {
      mode,
      orders: [],
      message:
        "Mainnet execution disabled. Set ALLOW_MAINNET=true after security review.",
    };
  }

  const spotBase =
    mode === "testnet"
      ? (process.env.SODEX_SPOT_BASE ??
        "https://testnet-gw.sodex.dev/api/v1/spot")
      : "https://mainnet-gw.sodex.dev/api/v1/spot";

  const chainId =
    mode === "testnet"
      ? Number(process.env.SODEX_CHAIN_ID ?? 138565)
      : 286623;

  const account = privateKeyToAccount(privateKey);
  const results: ExecutionResult["orders"] = [];

  for (const order of orders) {
    const nonce = await nextExecutionNonce();
    let symbolID: number;
    try {
      symbolID = requireSymbolId(order.symbol);
    } catch (e) {
      results.push({
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        status: "error",
        externalRef: e instanceof Error ? e.message : "symbol_unmapped",
      });
      continue;
    }
    const params = {
      accountID: Number(accountId),
      symbolID,
      orders: [
        {
          clOrdID: `tx-${fundId}-${nonce}`,
          modifier: 1,
          side: order.side === "buy" ? 1 : 2,
          type: 2,
          timeInForce: 3,
          quantity: order.quantity,
          reduceOnly: false,
          positionSide: 1,
        },
      ],
    };
    const payloadHash = compactPayload("newOrder", params);

    try {
      const signature = await account.signTypedData({
        domain: {
          name: "spot",
          version: "1",
          chainId,
          verifyingContract:
            "0x0000000000000000000000000000000000000000" as `0x${string}`,
        },
        types: {
          ExchangeAction: [
            { name: "payloadHash", type: "bytes32" },
            { name: "nonce", type: "uint64" },
          ],
        },
        primaryType: "ExchangeAction",
        message: {
          payloadHash: payloadHash as `0x${string}`,
          nonce: BigInt(nonce),
        },
      });

      const typedSig = `0x01${signature.slice(2)}` as `0x${string}`;

      const res = await fetch(`${spotBase}/trade/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-Key": keyName,
          "X-API-Sign": typedSig,
          "X-API-Nonce": nonce,
        },
        body: JSON.stringify(params),
      });

      const bodyText = await res.text().catch(() => "");
      results.push({
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        status: res.ok ? "submitted" : "failed",
        externalRef: parseOrderResponse(bodyText),
        nonce,
        symbolId: symbolID,
      });
    } catch (e) {
      results.push({
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        status: "error",
        externalRef: e instanceof Error ? e.message : "sign_failed",
        nonce,
        symbolId: symbolID,
      });
    }
  }

  const message =
    results.every((r) => r.status === "submitted")
      ? "Orders submitted to SoDEX."
      : "Partial or failed submission - check credentials and symbol IDs.";

  logExecution(fundId, "sodex_submit", {
    mode,
    submitted: results.filter((r) => r.status === "submitted").length,
    total: results.length,
  });

  return { mode, orders: results, message };
}

export function buildTradePlanFromAllocations(
  allocations: { symbol: string; weight: number }[],
  options?: { notionalUsd?: number; prices?: Record<string, number> }
): TradeOrderPlan[] {
  const notionalUsd = options?.notionalUsd ?? 100_000;
  const prices = options?.prices ?? {};
  return allocations
    .filter((a) => !["USDC", "USDT", "DAI"].includes(a.symbol.toUpperCase()))
    .flatMap((a) => {
      let px = prices[a.symbol.toUpperCase()];
      if (!px || px <= 0) {
        if (isProductionMode()) {
          throw new Error(`Missing live price for ${a.symbol}`);
        }
        if (!isMockExecutionAllowed()) {
          return [];
        }
        px = 1000;
      }
      const usd = a.weight * notionalUsd;
      const qty = usd / px;
      return [
        {
          symbol: a.symbol,
          side: "buy" as const,
          quantity: Math.max(qty, 0.0001).toFixed(6),
          notionalUsd: usd,
        },
      ];
    });
}

import { describe, expect, it } from "vitest";
import { isValidAddress, shortenAddress } from "@/lib/wallet/utils";

describe("wallet utils", () => {
  it("validates Ethereum addresses", () => {
    expect(isValidAddress("0xAbCdEf0123456789AbCdEf0123456789AbCdEf01")).toBe(
      true
    );
    expect(isValidAddress("not-an-address")).toBe(false);
    expect(isValidAddress("0xshort")).toBe(false);
  });

  it("shortens addresses for display", () => {
    const addr = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";
    expect(shortenAddress(addr)).toBe("0xAbCd…Ef01");
    expect(shortenAddress(addr, 6)).toBe("0xAbCdEf…CdEf01");
  });
});

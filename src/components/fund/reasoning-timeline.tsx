interface Log {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: Date | string;
}

export function ReasoningTimeline({ logs }: { logs: Log[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
        AI reasoning log
      </h3>
      <ol className="relative border-l border-border ml-2 space-y-6">
        {logs.map((log) => (
          <li key={log.id} className="ml-6">
            <span className="absolute -left-[5px] h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-xs text-muted uppercase">{log.type}</p>
            <p className="font-medium text-sm mt-0.5">{log.title}</p>
            <p className="text-sm text-muted mt-1 leading-relaxed">{log.body}</p>
            <time className="text-xs text-muted/80 mt-1 block">
              {new Date(log.createdAt).toLocaleString()}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}

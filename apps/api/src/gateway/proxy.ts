export function rewriteUpstreamPath(opts: {
      prefix: string;
      upstreamPathPrefix: string;
      requestPath: string;
    }): string {
      const prefix = opts.prefix.replace(/\/$/, "");
      const rest = opts.requestPath.startsWith(prefix)
        ? opts.requestPath.slice(prefix.length)
        : opts.requestPath;
      const tail = rest.startsWith("/") ? rest : `/${rest}`;
      const up = opts.upstreamPathPrefix.replace(/\/$/, "");
      if (!up) return tail === "" ? "/" : tail;
      return `${up}${tail === "/" ? "" : tail}` || "/";
    }

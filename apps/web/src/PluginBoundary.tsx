import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { name: string; children: ReactNode };

type State = { err: string | null };

export class PluginBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(error: Error): State {
    return { err: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[plugin ${this.props.name}]`, error, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="p-6 text-destructive">
          <h2 className="text-lg font-semibold">{this.props.name} crashed</h2>
          <p>{this.state.err}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

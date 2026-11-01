import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="stack card" style={{ maxWidth: 480, margin: "var(--space-12) auto" }}>
          <h1>خطای غیرمنتظره</h1>
          <p>متأسفیم، مشکلی پیش آمد. صفحه را دوباره بارگیری کنید.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            بارگیری مجدد
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

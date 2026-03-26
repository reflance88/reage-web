import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";
import {
  attemptChunkLoadRecovery,
  isChunkLoadError,
} from "@/lib/chunk-load-recovery";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    attemptChunkLoadRecovery(error);
  }

  render() {
    if (this.state.hasError) {
      const isRecoverableChunkError = isChunkLoadError(this.state.error);

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">
              {isRecoverableChunkError
                ? "페이지를 새 버전으로 불러오는 중 문제가 발생했습니다."
                : "An unexpected error occurred."}
            </h2>

            {isRecoverableChunkError ? (
              <p className="text-sm text-muted-foreground text-center mb-4">
                배포 직후 이전 파일이 남아 있으면 이런 문제가 생길 수 있습니다.
                아래 버튼으로 새로고침하면 최신 화면으로 다시 연결됩니다.
              </p>
            ) : null}

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

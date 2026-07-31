import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Terjadi kesalahan tak terduga.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 font-bold">!</div>
          <h1 className="text-lg font-semibold text-gray-900">Aplikasi error</h1>
          <p className="mt-1 text-sm text-gray-600">
            Halaman yang kamu buka gagal merender. Coba reload — data kamu tetap aman karena tersimpan di Supabase.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{message}</pre>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-lg bg-gray-950 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Muat ulang halaman
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    );
  }
}
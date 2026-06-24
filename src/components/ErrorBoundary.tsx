import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };
  public props!: Props;

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("HomePremium Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-10 text-white">Une erreur est survenue lors du chargement de l'accueil.</div>;
    }
    return this.props.children;
  }
}

import React from 'react';

import Header from './Header.js';

export default class ErrorBoundary extends React.Component {
  /** @param {React.PropsWithChildren} props */
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: /** @type {string | null} */ (null),
      componentStack: '',
    };
  }

  /** @param {{ message?: string } | null} error */
  static getDerivedStateFromError(error) {
    return {
      errorMessage: (error && error.message) || '',
    };
  }

  /**
   * @param {unknown} _
   * @param {{ componentStack: string }} info */
  componentDidCatch(_, { componentStack }) {
    this.setState({ componentStack });
  }

  render() {
    if (typeof this.state.errorMessage === 'string') {
      return (
        <>
          <Header onHeaderClick={() => null} />
          <div
            className="container-sm"
            style={{ marginTop: '2rem', marginBottom: '2rem', maxWidth: 600 }}
          >
            <h2>That's no fun.. the app crashed!</h2>
            <p className="fs-6">Something definitely went wrong...</p>
            <p>But we can fix it.</p>
            <p className="fs-5">
              <a
                href={`mailto:therealbenwiley@gmail.com?subject=Volca Sample Crash Report&body=Hi, I'm a user of the Volca Sample web app and the app crashed while using it.%0A%0AThis happened when [EXPLAIN WHAT YOU DID BEFORE THE APP CRASHED].%0A%0AHere are the crash details:%0A%0A${
                  this.state.errorMessage || 'Unknown error'
                }${this.state.componentStack.replace(/\r?\n|\r/g, '%0A')}`}
                target="_blank"
                rel="noreferrer"
              >
                Contact me
              </a>{' '}
              so I can get you back up and running.
            </p>
            <details>
              <summary>Crash details</summary>
              <pre>
                {this.state.errorMessage || 'Unknown error'}
                {this.state.componentStack}
              </pre>
            </details>
            <br />
            <button
              type="button"
              className="btn btn-light"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

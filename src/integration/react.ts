// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PureComponent, ReactNode } from 'react'
import type { Persistor } from '../types'

type Props = {
  onBeforeLift?: () => void,
  children: ReactNode | ((state: boolean) => ReactNode),
  loading: ReactNode,
  persistor: Persistor,
}

type State = {
  bootstrapped: boolean,
}

const logToNative = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data) {
      console.log(`[PersistGate] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`[PersistGate] ${message}`);
    }
  }
};

export class PersistGate extends PureComponent<Props, State> {
  static defaultProps = {
    children: null,
    loading: null,
  }

  state = {
    bootstrapped: false,
  }
  _unsubscribe?: () => void

  componentDidMount(): void {
    logToNative('componentDidMount')
    // Force initial check
    this.handlePersistorState()
    
    // Subscribe to future changes
    this._unsubscribe = this.props.persistor.subscribe(
      this.handlePersistorState
    )
  }

  handlePersistorState = (): void => {
    const { persistor } = this.props
    const persistorState = persistor.getState()
    
    logToNative('persistor state:', persistorState)

    // Check if we're already bootstrapped
    if (this.state.bootstrapped) {
      logToNative('already bootstrapped, returning')
      return
    }

    // Check if registry is empty (all reducers have rehydrated)
    const isBootstrapped = persistorState.registry.length === 0
    logToNative('isBootstrapped:', isBootstrapped)

    if (isBootstrapped) {
      if (this.props.onBeforeLift) {
        logToNative('calling onBeforeLift')
        Promise.resolve(this.props.onBeforeLift())
          .then(() => {
            logToNative('onBeforeLift completed')
            this.setState({ bootstrapped: true })
          })
          .catch(error => {
            logToNative('onBeforeLift failed:', error)
            // Even if onBeforeLift fails, we should still bootstrap
            this.setState({ bootstrapped: true })
          })
      } else {
        logToNative('no onBeforeLift, setting bootstrapped to true')
        this.setState({ bootstrapped: true })
      }

      if (this._unsubscribe) {
        logToNative('unsubscribing')
        this._unsubscribe()
      }
    }
  }

  componentWillUnmount(): void {
    if (this._unsubscribe) {
      logToNative('componentWillUnmount - unsubscribing')
      this._unsubscribe()
    }
  }

  render(): ReactNode {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof this.props.children === 'function' && this.props.loading)
        logToNative('expects either a function child or loading prop, but not both. The loading prop will be ignored.')
    }

    logToNative('render with bootstrapped = ' + this.state.bootstrapped)

    if (typeof this.props.children === 'function') {
      return this.props.children(this.state.bootstrapped)
    }

    return this.state.bootstrapped ? this.props.children : this.props.loading
  }
}

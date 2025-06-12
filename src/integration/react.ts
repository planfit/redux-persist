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
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('PersistGate: persistor state:', persistorState)
    }

    // Check if we're already bootstrapped
    if (this.state.bootstrapped) {
      return
    }

    // Check if registry is empty (all reducers have rehydrated)
    const isBootstrapped = persistorState.registry.length === 0

    if (isBootstrapped) {
      if (this.props.onBeforeLift) {
        Promise.resolve(this.props.onBeforeLift())
          .then(() => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('PersistGate: onBeforeLift completed')
            }
            this.setState({ bootstrapped: true })
          })
          .catch(error => {
            if (process.env.NODE_ENV !== 'production') {
              console.error('PersistGate: onBeforeLift failed:', error)
            }
            // Even if onBeforeLift fails, we should still bootstrap
            this.setState({ bootstrapped: true })
          })
      } else {
        this.setState({ bootstrapped: true })
      }

      if (this._unsubscribe) {
        this._unsubscribe()
      }
    }
  }

  componentWillUnmount(): void {
    if (this._unsubscribe) {
      this._unsubscribe()
    }
  }

  render(): ReactNode {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof this.props.children === 'function' && this.props.loading)
        console.error(
          'redux-persist: PersistGate expects either a function child or loading prop, but not both. The loading prop will be ignored.'
        )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('PersistGate: render with bootstrapped =', this.state.bootstrapped)
    }

    if (typeof this.props.children === 'function') {
      return this.props.children(this.state.bootstrapped)
    }

    return this.state.bootstrapped ? this.props.children : this.props.loading
  }
}

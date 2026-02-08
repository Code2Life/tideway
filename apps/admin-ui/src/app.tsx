import { FormEvent, useEffect, useMemo, useState } from 'react'

import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import {
  createAdminApiClient,
  type ConnectionItem,
  type TailEvent,
  type TopicItem,
} from './lib/api'

export const API_KEY_STORAGE_KEY = 'tideway.admin.apiKey'

type TabKey = 'topics' | 'connections' | 'tail'

type AppProps = {
  gatewayBaseUrl?: string
}

export function App({ gatewayBaseUrl = '' }: AppProps) {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) ?? '')
  const [activeTab, setActiveTab] = useState<TabKey>('topics')
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [connections, setConnections] = useState<ConnectionItem[]>([])
  const [tailTopic, setTailTopic] = useState('')
  const [tailEvents, setTailEvents] = useState<TailEvent[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  const client = useMemo(() => {
    return apiKey ? createAdminApiClient(gatewayBaseUrl, apiKey) : null
  }, [apiKey, gatewayBaseUrl])

  useEffect(() => {
    if (!client) {
      return
    }

    if (activeTab === 'topics') {
      client
        .listTopics()
        .then((response) => {
          setTopics(response.data)
          setErrorMessage('')
        })
        .catch((error: Error) => {
          setErrorMessage(error.message)
        })
    }

    if (activeTab === 'connections') {
      client
        .listConnections()
        .then((response) => {
          setConnections(response.data)
          setErrorMessage('')
        })
        .catch((error: Error) => {
          setErrorMessage(error.message)
        })
    }
  }, [activeTab, client])

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = apiKeyInput.trim()
    if (!normalized) {
      return
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, normalized)
    setApiKey(normalized)
    setApiKeyInput('')
  }

  const handleLoadTail = async () => {
    if (!client) {
      return
    }

    const normalizedTopic = tailTopic.trim()
    if (!normalizedTopic) {
      return
    }

    try {
      const response = await client.tailEvents(normalizedTopic)
      setTailEvents(response.events)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage((error as Error).message)
    }
  }

  if (!apiKey) {
    return (
      <main className="page">
        <Card>
          <h1 className="title">Tideway Admin</h1>
          <p className="subtitle">Sign in with a publisher API key to manage topics and streams.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="api-key">API Key</label>
            <Input
              id="api-key"
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
            />
            <Button type="submit">Login</Button>
          </form>
        </Card>
      </main>
    )
  }

  return (
    <main className="page">
      <Card>
        <header className="header-row">
          <div>
            <h1 className="title">Tideway Admin</h1>
            <p className="subtitle">Observe topics, active streams, and recent events.</p>
          </div>
          <Button
            tone="muted"
            onClick={() => {
              localStorage.removeItem(API_KEY_STORAGE_KEY)
              setApiKey('')
              setTailTopic('')
              setTailEvents([])
            }}
          >
            Logout
          </Button>
        </header>

        <nav className="tab-row" aria-label="Admin tabs">
          <Button tone={activeTab === 'topics' ? 'primary' : 'muted'} onClick={() => setActiveTab('topics')}>
            Topics
          </Button>
          <Button
            tone={activeTab === 'connections' ? 'primary' : 'muted'}
            onClick={() => setActiveTab('connections')}
          >
            Connections
          </Button>
          <Button tone={activeTab === 'tail' ? 'primary' : 'muted'} onClick={() => setActiveTab('tail')}>
            Tail Events
          </Button>
        </nav>

        {errorMessage ? <p role="alert">{errorMessage}</p> : null}

        {activeTab === 'topics' ? (
          <ul className="list">
            {topics.map((topic) => (
              <li key={topic.topic} className="list-item">
                <span>{topic.topic}</span>
                <span>{topic.connectionCount}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'connections' ? (
          <ul className="list">
            {connections.map((connection) => (
              <li key={connection.connectionId} className="list-item">
                <span>{connection.connectionId}</span>
                <span>{connection.topics.join(', ')}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'tail' ? (
          <section>
            <div className="tail-controls">
              <label htmlFor="tail-topic">Topic</label>
              <Input
                id="tail-topic"
                value={tailTopic}
                onChange={(event) => setTailTopic(event.target.value)}
              />
              <Button type="button" onClick={handleLoadTail}>
                Load Tail
              </Button>
            </div>
            <ul className="list">
              {tailEvents.map((event) => (
                <li key={event.id} className="list-item">
                  <span>{event.id}</span>
                  <span>{event.payload}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Card>
    </main>
  )
}

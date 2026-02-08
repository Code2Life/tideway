export type NodeRegistration = {
  nodeId: string
  hostname: string
  ip: string
  startedAt: string
}

export type ConnectionRegistration = {
  connectionId: string
  nodeId: string
  topics: string[]
}

export type PublishMessage = {
  topic: string
  id: string
}

export type PublishResult = {
  dropped: boolean
  topic: string
  id: string
  targetNodes: string[]
}

export type RedisAdapterOptions = {
  keyPrefix?: string
}

type RedisHash = Record<string, string>

export interface RedisLike {
  hset(key: string, values: RedisHash): Promise<void>
  hgetall(key: string): Promise<RedisHash>
  sadd(key: string, ...members: string[]): Promise<void>
  smembers(key: string): Promise<string[]>
  srem(key: string, ...members: string[]): Promise<void>
  del(...keys: string[]): Promise<void>
}

export class InMemoryRedis implements RedisLike {
  private readonly hashes = new Map<string, RedisHash>()
  private readonly sets = new Map<string, Set<string>>()

  async hset(key: string, values: RedisHash): Promise<void> {
    const existing = this.hashes.get(key) ?? {}
    this.hashes.set(key, {
      ...existing,
      ...values,
    })
  }

  async hgetall(key: string): Promise<RedisHash> {
    return { ...(this.hashes.get(key) ?? {}) }
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    const target = this.sets.get(key) ?? new Set<string>()
    for (const member of members) {
      target.add(member)
    }
    this.sets.set(key, target)
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? new Set<string>())]
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    const target = this.sets.get(key)
    if (!target) {
      return
    }

    for (const member of members) {
      target.delete(member)
    }

    if (target.size === 0) {
      this.sets.delete(key)
    }
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.hashes.delete(key)
      this.sets.delete(key)
    }
  }
}

export class RedisRuntimeAdapter {
  private readonly keyPrefix: string

  constructor(
    private readonly redis: RedisLike,
    options: RedisAdapterOptions = {},
  ) {
    this.keyPrefix = options.keyPrefix ?? 'tideway'
  }

  async registerNode(registration: NodeRegistration): Promise<void> {
    await this.redis.sadd(this.nodesKey(), registration.nodeId)
    await this.redis.hset(this.nodeKey(registration.nodeId), {
      nodeId: registration.nodeId,
      hostname: registration.hostname,
      ip: registration.ip,
      startedAt: registration.startedAt,
    })
  }

  async registerConnection(registration: ConnectionRegistration): Promise<void> {
    const normalizedTopics = normalizeTopics(registration.topics)

    await this.redis.hset(this.connectionKey(registration.connectionId), {
      connectionId: registration.connectionId,
      nodeId: registration.nodeId,
      topics: normalizedTopics.join(','),
    })
    await this.redis.sadd(this.nodeConnectionsKey(registration.nodeId), registration.connectionId)

    for (const topic of normalizedTopics) {
      await this.redis.sadd(this.topicNodesKey(topic), registration.nodeId)
      await this.redis.sadd(this.topicConnectionsKey(topic), registration.connectionId)
    }
  }

  async unregisterConnection(connectionId: string): Promise<void> {
    const existing = await this.redis.hgetall(this.connectionKey(connectionId))
    if (!existing.connectionId || !existing.nodeId) {
      return
    }

    const topics = existing.topics ? normalizeTopics(existing.topics.split(',')) : []

    await this.redis.srem(this.nodeConnectionsKey(existing.nodeId), connectionId)

    for (const topic of topics) {
      await this.redis.srem(this.topicConnectionsKey(topic), connectionId)

      const nodeStillHasTopic = await this.nodeHasTopic(existing.nodeId, topic)
      if (!nodeStillHasTopic) {
        await this.redis.srem(this.topicNodesKey(topic), existing.nodeId)
      }
    }

    await this.redis.del(this.connectionKey(connectionId))
  }

  async unregisterNode(nodeId: string): Promise<void> {
    const connectionIds = await this.redis.smembers(this.nodeConnectionsKey(nodeId))

    for (const connectionId of connectionIds) {
      await this.unregisterConnection(connectionId)
    }

    await this.redis.del(this.nodeKey(nodeId))
    await this.redis.srem(this.nodesKey(), nodeId)
  }

  async getTopicDistribution(topic: string): Promise<string[]> {
    const topicNodes = await this.redis.smembers(this.topicNodesKey(topic))
    return topicNodes.sort()
  }

  async publishToTopic(message: PublishMessage): Promise<PublishResult> {
    const targetNodes = await this.getTopicDistribution(message.topic)

    return {
      dropped: targetNodes.length === 0,
      topic: message.topic,
      id: message.id,
      targetNodes,
    }
  }

  private async nodeHasTopic(nodeId: string, topic: string): Promise<boolean> {
    const connectionIds = await this.redis.smembers(this.nodeConnectionsKey(nodeId))

    for (const connectionId of connectionIds) {
      const existing = await this.redis.hgetall(this.connectionKey(connectionId))
      const topics = normalizeTopics(existing.topics?.split(',') ?? [])
      if (topics.includes(topic)) {
        return true
      }
    }

    return false
  }

  private nodesKey(): string {
    return `${this.keyPrefix}:nodes`
  }

  private nodeKey(nodeId: string): string {
    return `${this.keyPrefix}:node:${nodeId}`
  }

  private nodeConnectionsKey(nodeId: string): string {
    return `${this.keyPrefix}:node:${nodeId}:connections`
  }

  private connectionKey(connectionId: string): string {
    return `${this.keyPrefix}:connection:${connectionId}`
  }

  private topicNodesKey(topic: string): string {
    return `${this.keyPrefix}:topic:${topic}:nodes`
  }

  private topicConnectionsKey(topic: string): string {
    return `${this.keyPrefix}:topic:${topic}:connections`
  }
}

function normalizeTopics(topics: string[]): string[] {
  const normalized = topics
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0)

  return [...new Set(normalized)]
}

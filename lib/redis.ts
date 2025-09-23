import { Redis } from '@upstash/redis'

const getRedisClient = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Redis credentials not found. Using mock client for build.')
    return null
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export const redis = getRedisClient() as Redis

export const LEASE_KEY = 'lease:default'
export const READINGS_KEY = 'readings:default'
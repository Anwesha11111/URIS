/**
 * Typed Axios error extraction.
 * Centralises the pattern used across every catch block so it is never duplicated.
 */
import { isAxiosError } from 'axios'

/**
 * Returns the backend `message` string when the server responded with one,
 * otherwise falls back to the native Error message, otherwise the fallback.
 */
export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (isAxiosError(err)) {
    const serverMsg = err.response?.data?.message
    if (typeof serverMsg === 'string' && serverMsg.length > 0) return serverMsg
    return err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}

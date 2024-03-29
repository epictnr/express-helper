import {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
  RequestHandler,
} from 'express'
import { Logger } from 'winston'

interface RawBodyRequest extends Request {
  rawBody?: string
}

type Clarification = Record<string, any>

export function sendError (res: Response, code: string, mess: string, status: number, clarification: Clarification): void {
  clarification = clarification || {}
  res.statusCode = status || 500
  res.setHeader('Content-Type', 'application/json')
  res.json({'code': code, 'message': mess, 'clarification': clarification})
}

export function captureRawBody (req: RawBodyRequest, res: Response, buf: Buffer, encoding: BufferEncoding): void {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

export function createErrorHandler (logger: Logger): ErrorRequestHandler {
  return (error, req: RawBodyRequest, res: Response, next: NextFunction) => {
    if (error.type === 'entity.parse.failed') {
      let rawBody = ''

      if (req.hasOwnProperty('rawBody')) {
        rawBody = String(req.rawBody)
      }

      logger.error(`JSON body parse error endpoint: ${req.url} request: "${rawBody.substring(0, 80)}"`)
    }

    logger.error(`${error.stack}`, error)
    sendError(res, 'UNCAUGHT_ERROR', 'Uncaught error', 500, {})
  }
}

export function createNotFoundHandler (): RequestHandler {
  return (req: RawBodyRequest, res: Response) => {
    sendError(res, 'ROUTE_NOT_FOUND', 'Route not found', 404, {'route': req.url})
  }
}

export function createDeprecatedRouteHandler (logger: Logger) {
  return (action: RequestHandler): RequestHandler => {
    return async (request: RawBodyRequest, response: Response, next: NextFunction) => {
      const initiatorService = request.headers['X-Internal-Initiator-Service'] || 'not set'
      logger.warn(`Called DEPRECATED route [${request.url}] X-Internal-Initiator-Service: [${initiatorService}]`)

      await action(request, response, next)
    }
  }
}

export type MultipleIdsCallback = (id: string) => any
export type MultipleIdsResult = {
  list: Array<any>
  notFoundIds: Array<string>
}

export async function handleMultipleIds (ids: Array<string>, callback: MultipleIdsCallback): Promise<MultipleIdsResult> {
  ids = ids || []

  if (!Array.isArray(ids)) {
    ids = [ids]
  }

  const list: Array<any> = []
  const notFoundIds: Array<string> = []

  for (const id of ids) {
    const result = await callback(id)

    if (!result) {
      notFoundIds.push(id)
      continue
    }

    list.push(result)
  }

  return {
    list: list,
    notFoundIds: notFoundIds,
  }
}

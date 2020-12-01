import { handleMultipleIds } from './helper'

test('test', async () => {
  const ids = [
    '1',
    '2',
    '3',
    '4',
  ]

  const callback = (id: string) => {
    if (id === '4') {
      return null
    }

    return id
  }

  const result = await handleMultipleIds(ids, callback)

  expect(result.list).toEqual(['1', '2', '3'])
  expect(result.notFoundIds).toEqual(['4'])
})

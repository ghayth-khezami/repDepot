import type { PaginatedResponse } from '../../types';

type Tag = 'User' | 'Client' | 'CoClient' | 'Category' | 'Product' | 'Command' | 'DepositRequest' | 'ClientFeedback' | 'Newsletter';

/**
 * Infinite-scroll version of a paginated admin list (RTK infinite query: every loaded page is
 * refetched together when the tag is invalidated, so edits/deletes never leave stale rows).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pagedFeed<T, A extends Record<string, unknown>>(builder: any, url: string, tag: Tag, pageSize = 20) {
  return builder.infiniteQuery({
    infiniteQueryOptions: {
      initialPageParam: 1,
      getNextPageParam: (last: PaginatedResponse<T>) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    },
    query: ({ queryArg, pageParam }: { queryArg: A; pageParam: number }) => ({
      url,
      params: Object.fromEntries(Object.entries({ ...queryArg, page: pageParam, limit: pageSize }).filter(([, v]) => v !== undefined && v !== '' && v !== null)),
    }),
    providesTags: [tag],
  });
}

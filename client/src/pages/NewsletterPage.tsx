import { useState } from 'react';
import { useInfiniteList } from '../hooks/useInfiniteList';
import ReusableTable, { Column } from '../components/ReusableTable';
import {
  NewsletterContact,
  useGetNewsletterContactsQuery, useGetNewsletterContactsFeedInfiniteQuery,
} from '../store/api/newsletterApi';
import ExcelButton from '../components/ExcelButton';

const NewsletterPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading, infinite } = useInfiniteList<NewsletterContact>(useGetNewsletterContactsFeedInfiniteQuery({search: search || undefined,
  }));

  const columns: Column<NewsletterContact>[] = [
    { header: 'Email', accessor: 'email' },
    {
      header: 'Source',
      accessor: 'source',
      render: (v) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            v === 'newsletter'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {v === 'newsletter' ? 'Newsletter' : 'Compte client'}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (v) => new Date(String(v)).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Newsletter & emails clients</h1>
        <p className="bo-muted mt-2">
          Inscriptions newsletter et comptes clients (rôle CLIENT, hors déposants).
        </p>
      </div>

      <ReusableTable
        toolbarExtra={<ExcelButton entity="newsletter" params={{ search }} compact />}
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un email..."
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        infinite={infinite}
      />
    </div>
  );
};

export default NewsletterPage;

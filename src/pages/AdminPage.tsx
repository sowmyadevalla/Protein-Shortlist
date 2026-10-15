import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { fetchDataSources, fetchIngestionJobs, fetchProducts } from '@/lib/queries';
import type { DataSource, IngestionJob } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import {
  Shield, Database, Zap, Package, Activity, CheckCircle2, XCircle,
  Clock, AlertTriangle, Lock, ExternalLink, FileText
} from 'lucide-react';
import { getRegisteredAdapters } from '@/lib/adapters/types';

export function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { navigate } = useRouter();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile?.is_admin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [sources, jbs, prods] = await Promise.all([
          fetchDataSources(),
          fetchIngestionJobs(),
          fetchProducts(),
        ]);
        setDataSources(sources);
        setJobs(jbs);
        setProductCount(prods.length);
      } catch {
        // handled by error display
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile, authLoading]);

  if (authLoading || loading) return <div className="py-20 text-center text-sm text-gray-400">Loading...</div>;

  if (!user) {
    return (
      <EmptyState
        icon={<Lock size={28} />}
        title="Admin access required"
        description="Sign in with an administrator account to manage data sources and ingestion."
        action={<button onClick={() => navigate('/profile')} className="ps-btn-primary">Sign in</button>}
      />
    );
  }

  if (!profile?.is_admin) {
    return (
      <EmptyState
        icon={<Shield size={28} />}
        title="Not authorized"
        description="Your account does not have admin privileges. Contact an administrator to get access."
        action={<button onClick={() => navigate('/')} className="ps-btn-secondary">Back to home</button>}
      />
    );
  }

  const registeredAdapters = getRegisteredAdapters();

  const stats = [
    { label: 'Products', value: productCount, icon: Package },
    { label: 'Data sources', value: dataSources.length, icon: Database },
    { label: 'Ingestion jobs', value: jobs.length, icon: Activity },
    { label: 'Enabled adapters', value: registeredAdapters.filter((a) => a.enabled).length, icon: Zap },
  ];

  return (
    <div className="py-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Manage data sources, adapters, and ingestion jobs.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="ps-card p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Data Sources */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Database size={20} className="text-gray-500" />
          Data sources
        </h2>

        {dataSources.length === 0 ? (
          <div className="ps-card p-6 text-center text-sm text-gray-500">
            No data sources configured. Use the adapter registry to set up product data feeds.
          </div>
        ) : (
          <div className="space-y-3">
            {dataSources.map((source) => (
              <div key={source.id} className="ps-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{source.name}</h3>
                      {source.is_enabled ? (
                        <span className="ps-badge-green">
                          <CheckCircle2 size={12} />
                          Enabled
                        </span>
                      ) : (
                        <span className="ps-badge-gray">
                          <XCircle size={12} />
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Type: {source.source_type}
                      {source.api_base_url && (
                        <span className="ml-2 text-gray-400">
                          API: {source.api_base_url}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Adapter Registry */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Zap size={20} className="text-gray-500" />
          Adapter registry
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-500">
          Configured and available data adapters. Disabled adapters have no credentials or agreements in place.
        </p>
        <div className="space-y-3">
          {registeredAdapters.map((reg) => (
            <div key={reg.adapter.slug} className="ps-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{reg.adapter.name}</h3>
                    {reg.enabled ? (
                      <span className="ps-badge-green">Active</span>
                    ) : (
                      <span className="ps-badge-gray">
                        <Lock size={10} />
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Slug: {reg.adapter.slug}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Configured: {reg.adapter.isConfigured() ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open Food Facts info */}
      <section className="mb-8">
        <div className="ps-card border-gray-200 bg-gray-50/50 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText size={16} />
            Open Food Facts — API compliance notes
          </h3>
          <ul className="space-y-2.5 text-xs leading-relaxed text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
              <span><strong>User-Agent:</strong> Requests include a descriptive User-Agent identifying the app and contact.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
              <span><strong>Rate limits:</strong> Honored per OFF documentation. 429 responses trigger backoff. Field selection used to minimize response size.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
              <span><strong>Licensing:</strong> Data under Open Database License (ODbL). Attribution required. Images under CC BY-SA.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <span><strong>Limitation:</strong> OFF does not provide Indian retailer prices, stock, or checkout. Retailer offers must come from authorized affiliate feeds.</span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink size={14} className="mt-0.5 shrink-0" />
              <a
                href="https://openfoodfacts.github.io/openfoodfacts-server/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:underline"
              >
                Read the OFF API documentation
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Ingestion Jobs */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Activity size={20} className="text-gray-500" />
          Recent ingestion jobs
        </h2>
        {jobs.length === 0 ? (
          <div className="ps-card p-6 text-center text-sm text-gray-500">
            No ingestion jobs have been run yet.
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="ps-card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {job.status === 'completed' && <CheckCircle2 size={18} className="text-teal" />}
                  {job.status === 'running' && <Clock size={18} className="text-coral-ink" />}
                  {job.status === 'failed' && <XCircle size={18} className="text-red-500" />}
                  {job.status === 'pending' && <Clock size={18} className="text-gray-400" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.status}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{job.records_processed} processed</p>
                  <p>{job.records_imported} imported, {job.records_updated} updated</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

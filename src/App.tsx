import { RouterProvider, useRouter, parsePath } from '@/lib/router';
import { AuthProvider } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { SearchPage } from '@/pages/SearchPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ComparePage } from '@/pages/ComparePage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { SavedProductsPage } from '@/pages/SavedProductsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { BasketPage } from '@/pages/BasketPage';
import { AdminPage } from '@/pages/AdminPage';

function Routes() {
  const { path } = useRouter();
  const { segments } = parsePath(path);

  const first = segments[0] ?? '';

  switch (first) {
    case '':
      return <HomePage />;
    case 'discover':
      return <DiscoverPage />;
    case 'search':
      return <SearchPage />;
    case 'products':
      return <ProductDetailPage />;
    case 'compare':
      return <ComparePage />;
    case 'categories':
      return <CategoriesPage />;
    case 'saved':
      return <SavedProductsPage />;
    case 'profile':
      return <ProfilePage />;
    case 'basket':
      return <BasketPage />;
    case 'admin':
      return <AdminPage />;
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Layout>
          <Routes />
        </Layout>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;

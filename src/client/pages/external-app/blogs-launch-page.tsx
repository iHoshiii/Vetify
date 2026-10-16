import { useParams } from 'react-router-dom';
import ExternalAppPage from './external-app-page';

export default function BlogsLaunchPage() {
  const { slug } = useParams();
  const destination = slug ? `/blogs/${encodeURIComponent(slug)}` : '/blogs';
  return <ExternalAppPage feature="blogs" destination={destination} />;
}

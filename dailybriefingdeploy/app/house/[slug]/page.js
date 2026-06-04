import Stub from '../../components/Stub';
import { HOUSES } from '../../../lib/seed';

export default function HousePage({ params }) {
  const house = HOUSES.find((h) => h.slug === params.slug);
  const title = house ? house.name : params.slug;
  const subtitle = house
    ? `${house.type === 'cluster' ? 'Retail cluster' : 'Residential house'} view · Coming soon`
    : 'Unknown house · Coming soon';
  return <Stub icon="🏛️" title={title} subtitle={subtitle} />;
}

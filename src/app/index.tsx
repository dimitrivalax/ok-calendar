import { Redirect } from 'expo-router';

import { href } from '@/navigation/href';

export default function Index() {
  return <Redirect href={href('/(calendar)')} />;
}

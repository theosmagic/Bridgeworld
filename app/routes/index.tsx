import { ConnectKitButton } from 'connectkit';

export const loader = async () => {
  console.log(process.env.SECRET);
  return null;
};
export default function Index() {
  return (
    <div>
      <pre>{JSON.stringify(ENV, null, 2)}</pre>
      <ConnectKitButton />
      Index
    </div>
  );
}

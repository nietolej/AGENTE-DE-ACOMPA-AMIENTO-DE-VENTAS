import { getClientInfo } from './clientes';

async function test() {
  const info = await getClientInfo('00000500');
  console.log('00000500:', info);
}

test();

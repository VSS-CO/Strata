import('electron').then(m => {
  console.log('Module:', m);
  console.log('Keys:', Object.keys(m));
  if (m.app) {
    console.log('electron.app found');
  } else {
    console.log('electron.app NOT found');
  }
}).catch(e => console.error('Error:', e.message));

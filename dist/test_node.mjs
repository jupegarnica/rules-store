import { Store } from './Store.mjs';
const db = new Store();

console.log(db.set('a', 1));

console.log(db.get(''));

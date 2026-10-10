import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');
await cp('src','dist/src',{recursive:true});
await mkdir('dist/data',{recursive:true});
await cp('data/registry','dist/data/registry',{recursive:true});
console.log('Built Monad City to dist/');

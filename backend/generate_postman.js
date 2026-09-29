const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.routes.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const routeFiles = getFiles(srcDir);
const collection = {
  info: {
    name: 'DripNow API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: []
};

routeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const folderName = path.basename(file, '.routes.ts');
  const folder = {
    name: folderName.charAt(0).toUpperCase() + folderName.slice(1),
    item: []
  };

  const regex = /router\.(get|post|put|patch|delete)\(['"`](.*?)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    
    folder.item.push({
      name: `${method} ${routePath}`,
      request: {
        method: method,
        header: [
          { key: 'Authorization', value: 'Bearer {{token}}', type: 'text' },
          { key: 'Content-Type', value: 'application/json', type: 'text' }
        ],
        url: {
          raw: `{{base_url}}/api/v1/${folderName}${routePath === '/' ? '' : routePath}`,
          host: ['{{base_url}}'],
          path: ['api', 'v1', folderName, ...routePath.split('/').filter(p => p)]
        }
      },
      response: []
    });
  }
  
  if (folder.item.length > 0) {
    collection.item.push(folder);
  }
});

fs.writeFileSync(path.join(__dirname, 'DripNow_Postman_Collection.json'), JSON.stringify(collection, null, 2));
console.log('Collection generated: DripNow_Postman_Collection.json');

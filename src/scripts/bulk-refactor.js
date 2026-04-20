const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /properties(?!\/|\.png|\.jpg|\.svg)/g, to: 'properties' },
  { from: /Properties(?![a-z])/g, to: 'Properties' },
  { from: /Property(?![a-z])/g, to: 'Property' },
  { from: /property(?![a-z])/g, to: 'property' },
  { from: /getProperties/g, to: 'getProperties' },
  { from: /createProperty/g, to: 'createProperty' },
  { from: /updateProperty/g, to: 'updateProperty' },
  { from: /deleteProperty/g, to: 'deleteProperty' },
  { from: /archiveProperty/g, to: 'archiveProperty' },
  { from: /approveProperty/g, to: 'approveProperty' },
  { from: /bulkCreateProperties/g, to: 'bulkCreateProperties' },
  { from: /getPropertyById/g, to: 'getPropertyById' },
  { from: /properties/g, to: 'properties' },
  { from: /properties/g, to: 'properties' },
  { from: /property/g, to: 'property' },
  { from: /property/g, to: 'property' },
  { from: /Property/g, to: 'Property' },
  { from: /Property/g, to: 'Property' },
  { from: /Properties/g, to: 'Properties' },
  { from: /Properties/g, to: 'Properties' }
];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'dist') {
        walk(filepath, callback);
      }
    } else if (stats.isFile()) {
      const ext = path.extname(filepath);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.sql'].includes(ext)) {
        callback(filepath);
      }
    }
  });
}

walk('./src', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;
  
  replacements.forEach(rep => {
    if (rep.from.test(content)) {
      content = content.replace(rep.from, rep.to);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filepath, content);
    console.log(`Updated: ${filepath}`);
  }
});

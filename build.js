/* Genera recia-standalone.html: mismo código, todo inline en un solo archivo. */
const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Ojo: el reemplazo va como función. Con string, `$$` y `$&` se interpretan
// como patrones de sustitución y corrompen el código inlineado.
const inline = (needle, replacement) => {
  if (html.indexOf(needle) === -1) throw new Error('No se encontró: ' + needle);
  html = html.replace(needle, () => replacement);
};

inline(
  '<link rel="stylesheet" href="css/styles.css">',
  '<style>\n' + fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8') + '\n</style>'
);

['utils', 'storage', 'ai', 'receipts', 'dashboard', 'app'].forEach(name => {
  inline(
    '<script src="js/' + name + '.js"></script>',
    '<script>\n' + fs.readFileSync(path.join(root, 'js/' + name + '.js'), 'utf8') + '\n</script>'
  );
});

if (html.indexOf('<script src=') !== -1 || html.indexOf('href="css/') !== -1) {
  throw new Error('Quedaron referencias externas sin inlinear.');
}

fs.writeFileSync(path.join(root, 'recia-standalone.html'), html);
console.log('recia-standalone.html generado:', (html.length / 1024).toFixed(0) + ' KB');

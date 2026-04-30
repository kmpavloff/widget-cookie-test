const fs = require("fs");

const templateName = process.env.IS_DASHBOARD === "true"
  ? "template-dashboard.html"
  : "template-site.html";

const template = fs.readFileSync(templateName, "utf-8");
const result = template.replace(/\$\{(\w+)\}/g, (match, key) => {
  return process.env[key] !== undefined ? process.env[key] : match;
});

fs.writeFileSync("index.html", result);
console.log(`Generated index.html for ${process.env.SITE_NAME} (template: ${templateName})`);

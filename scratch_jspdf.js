const { jsPDF } = require("jspdf");
require("jspdf-autotable");

try {
  const doc = new jsPDF();
  doc.text("Hello Node", 10, 10);
  doc.autoTable({
    head: [['Name', 'Email', 'Country']],
    body: [
      ['David', 'david@example.com', 'Sweden'],
      ['Castille', 'castille@example.com', 'Spain']
    ]
  });
  const buf = doc.output('arraybuffer');
  console.log("PDF generated successfully, size:", buf.byteLength);
} catch (e) {
  console.error("Failed to generate PDF in Node:", e);
}

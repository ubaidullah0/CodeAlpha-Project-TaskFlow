const nodemailer = require('nodemailer');
async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: 'obaidkhan13542@gmail.com', pass: 'befm wcwn bwqz lmsk' }
  });
  try {
    await transporter.sendMail({ from: 'test', to: 'obaidkhan13542@gmail.com', text: 'test' });
    console.log('Success');
  } catch (err) { console.error('Failed:', err.message); }
}
testEmail();

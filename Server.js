const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Monce AI contact server is running!');
});

// Send email function
async function sendEmail(submission) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "ce24bcc4d346b5",
      pass: "d81c4275f7913a"
    }
  });

  const mailOptions = {
    from: submission.email,
    to: "company@example.com",
    subject: `New contact from ${submission.name}`,
    text: `
Name: ${submission.name}
Email: ${submission.email}
Company: ${submission.company}
Phone: ${submission.phone}
Project Type: ${submission.projectType}
Message: ${submission.message}
    `
  };

  return transporter.sendMail(mailOptions);
}

// Validation
function validatePayload(body) {
  const errors = [];
  if (!body.name) errors.push("Name is required");
  if (!body.email) errors.push("Email is required");
  if (!body.message) errors.push("Message is required");

  return {
    isValid: errors.length === 0,
    errors,
    cleaned: {
      name: body.name.trim(),
      email: body.email.trim(),
      company: body.company?.trim() || "",
      phone: body.phone?.trim() || "",
      projectType: body.projectType?.trim() || "",
      message: body.message.trim()
    }
  };
}

// Saves submissions to JSON file
async function persistSubmission(submission) {
  const filePath = path.join(__dirname, 'contact-submissions.json');
  let existing = [];

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath);
      existing = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading existing submissions:", err);
  }

  existing.push(submission);

  try {
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    console.log("Saved submission:", submission);
  } catch (err) {
    console.error("Error saving submission:", err);
  }
}

// Contact endpoint
app.post('/api/contact', async (req, res) => {
  const { isValid, errors, cleaned } = validatePayload(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, errors });
  }

  const submission = {
    ...cleaned,
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString()
  };

  await persistSubmission(submission);

  // Send email
  try {
    await sendEmail(submission);
  } catch (err) {
    console.error("Email failed:", err);
  }

  res.status(201).json({
    ok: true,
    message: 'Thanks for reaching out! We will be in touch shortly.'
  });
});

// Start server
app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});

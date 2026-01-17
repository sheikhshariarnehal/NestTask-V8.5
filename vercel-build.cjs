const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log build environment info
console.log('== Build Environment Info (CJS) ==');
console.log(`Node version: ${process.version}`);
console.log(`PWD: ${process.cwd()}`);
console.log(`VERCEL: ${process.env.VERCEL || 'Not set'}`);
console.log('== Environment Variables ==');
console.log(`VITE_SUPABASE_URL set: ${process.env.VITE_SUPABASE_URL ? 'Yes' : 'No'}`);
console.log(`VITE_SUPABASE_ANON_KEY set: ${process.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}`);

// Function to recursively check files for encoding issues
function checkFilesForEncodingIssues(dirPath, fileExtensions = ['.ts', '.tsx']) {
  try {
    console.log(`Checking for encoding issues in ${dirPath}...`);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          checkFilesForEncodingIssues(fullPath, fileExtensions);
        }
      } else if (entry.isFile() && fileExtensions.some(ext => entry.name.endsWith(ext))) {
        // Check file for BOM or other encoding issues
        try {
          // First, check the file as binary to detect BOM markers
          const buffer = fs.readFileSync(fullPath);
          let hasBOM = false;
          
          // Check for different BOM markers
          if (buffer.length >= 3 && 
              buffer[0] === 0xEF && 
              buffer[1] === 0xBB && 
              buffer[2] === 0xBF) {
            hasBOM = true; // UTF-8 BOM
          } else if (buffer.length >= 2 && 
                   buffer[0] === 0xFE && 
                   buffer[1] === 0xFF) {
            hasBOM = true; // UTF-16 BE BOM
          } else if (buffer.length >= 2 && 
                   buffer[0] === 0xFF && 
                   buffer[1] === 0xFE) {
            hasBOM = true; // UTF-16 LE BOM
          }
          
          if (hasBOM) {
            console.log(`Found BOM in ${fullPath}`);
            
            // Read as UTF-8 and remove BOM
            const fileContent = fs.readFileSync(fullPath, 'utf8')
              .replace(/^\uFEFF/, '');  // Remove UTF-8 BOM
            fs.writeFileSync(fullPath, fileContent, 'utf8');
            console.log(`Fixed BOM issue in ${fullPath}`);
            continue; // Skip to next file
          }
          
          // Also check for other encoding issues
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          // Check for other common encoding problem markers
          if (fileContent.includes('') || 
              /[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/.test(fileContent.substring(0, 20))) {
            console.log(`Found encoding issue in ${fullPath}`);
            
            // Try to clean the file by removing problematic characters
            const cleanContent = fileContent
              .replace(/[^\x20-\x7E\x0A\x0D\u00A0-\uFFFF]/g, ''); // Keep only printable chars
            fs.writeFileSync(fullPath, cleanContent, 'utf8');
            console.log(`Attempted to fix encoding issue in ${fullPath}`);
          }
        } catch (fileErr) {
          console.error(`Error reading/processing ${fullPath}:`, fileErr.message);
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err.message);
  }
}

// Copy production env file
try {
  if (fs.existsSync('.env.production')) {
    const envProdContent = fs.readFileSync('.env.production', 'utf8');
    fs.writeFileSync('.env', envProdContent);
    console.log('Successfully copied .env.production to .env');
  } else {
    console.warn('.env.production file not found');
    
    // Create .env file with hardcoded values as fallback
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Creating fallback .env file with hardcoded values');
      const fallbackEnv = 
`VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbXV4bnNmemtmZnptaGJtdHRzIiwicm9sZSI6ImFub24iLCJpYVQiOjE3NDg3MDE0ODMsImV4cCI6MjA2NDI3NzQ4M30.0y17sSd6pDwJzj4VXqJiclAQeI3V_dtFihbtF-jlcTI
VITE_SUPABASE_URL=https://hsmuxnsfzkffzmhbmtts.supabase.co`;
      fs.writeFileSync('.env', fallbackEnv);
      console.log('Fallback .env file created');
    }
  }
} catch (error) {
  console.error('Error handling environment files:', error);
}

// Run build
try {
  console.log('Starting build process...');
  
  // First, ensure all dependencies are installed, especially @radix-ui/react-dropdown-menu
  console.log('Ensuring all dependencies are installed...');
  try {
    execSync('npm install @radix-ui/react-dropdown-menu@^2.0.6 --no-save', { stdio: 'inherit' });
    console.log('Successfully installed required dependencies');
  } catch (depError) {
    console.error('Error installing dependencies:', depError);
    // Continue with build anyway
  }
  
  // Check for encoding issues in source files before building
  console.log('Checking for file encoding issues...');
  checkFilesForEncodingIssues('./src');
  console.log('Finished checking for encoding issues');
  
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Copy _headers file to dist if it exists
if (fs.existsSync('_headers')) {
  try {
    fs.copyFileSync('_headers', path.join('dist', '_headers'));
    console.log('Successfully copied _headers to dist directory');
  } catch (error) {
    console.error('Error copying _headers file:', error);
  }
}

// Create 200.html from index.html for SPA routing
try {
  if (fs.existsSync(path.join('dist', 'index.html'))) {
    fs.copyFileSync(
      path.join('dist', 'index.html'), 
      path.join('dist', '200.html')
    );
    console.log('Successfully created 200.html for SPA routing');
  } else {
    console.error('index.html not found, cannot create 200.html');
  }
} catch (error) {
  console.error('Error creating 200.html:', error);
}

// Check dist directory
try {
  const distFiles = fs.readdirSync('dist');
  console.log('== Dist Directory Contents ==');
  console.log(distFiles);
  
  // Check if index.html exists
  if (distFiles.includes('index.html')) {
    console.log('index.html found in dist directory');
    const indexContent = fs.readFileSync(path.join('dist', 'index.html'), 'utf8');
    console.log(`index.html size: ${indexContent.length} bytes`);
  } else {
    console.error('index.html NOT FOUND in dist directory!');
  }
} catch (error) {
  console.error('Error checking dist directory:', error);
} 
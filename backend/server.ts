import bodyParser from 'body-parser';
import propertyService from './property.js';
// import agentService from './agent';
import express, { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import { Strategy as FacebookStrategy, Profile } from 'passport-facebook';
import dotenv from 'dotenv';
import pool from './db.js';
import { fileURLToPath } from 'url';

// Fix for `__dirname` in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the app and load environment variables
dotenv.config();
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


//fb passport
const SECRET_SESSION_KEY = process.env.SECRET_SESSION_KEY;
if (SECRET_SESSION_KEY)
  app.use(session({
    secret: SECRET_SESSION_KEY, 
    resave: false,
    saveUninitialized: true
  }));

app.use(passport.initialize());
app.use(passport.session());

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;


async function ensureTableExists() {
    try {
        const result = await pool.query(
            `SELECT EXISTS (
                SELECT FROM pg_catalog.pg_tables
                WHERE schemaname = 'public'
                AND tablename = 'users'
            );`
        );

        const tableExists = result.rows[0].exists;

        if (!tableExists) {
            console.log('Table "users" does not exist. Creating...');
            await pool.query(
                `CREATE TABLE users (
                    id VARCHAR(255) PRIMARY KEY,
                    display_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    ifApproved BOOLEAN DEFAULT FALSE
                );`
            );
            console.log('Table "users" created successfully.');
        } else {
            console.log('Table "users" already exists.');
        }
    } catch (error) {
        console.error('Error ensuring table exists:', error);
    }
}

(async () => {
    await ensureTableExists();
    console.log('Database setup completed.');
})();


if (APP_ID && APP_SECRET) {
  passport.use(new FacebookStrategy({
      clientID: APP_ID, 
      clientSecret: APP_SECRET, 
      callbackURL: 'https://c4fa-2a0d-6fc2-5a00-a900-a897-7219-b4e-91e1.ngrok-free.app/auth/facebook/callback', // Adjust for your domain
      profileFields: ['id', 'displayName', 'email'] // Request specific fields
  }, async (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any) => void) => {
      try {
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [profile.id]);

          let user;
          if (userResult.rows.length === 0) {
              await pool.query(
                  'INSERT INTO users (id, display_name, email, ifApproved) VALUES ($1, $2, $3, $4)',
                  [
                      profile.id,
                      profile.displayName,
                      profile.emails?.[0]?.value || null,
                      false 
                  ]
              );

              user = {
                  id: profile.id,
                  displayName: profile.displayName,
                  email: profile.emails?.[0]?.value || null,
                  ifApproved: false
              };
          } else {

              const existingUser = userResult.rows[0];

              user = {
                  id: existingUser.id,
                  displayName: existingUser.display_name,
                  email: existingUser.email,
                  ifApproved: existingUser.ifapproved // Extract the ifApproved field
              };
          }

          return done(null, user);
      } catch (error) {
          console.error('Error saving or retrieving user from the database:', error);
          return done(error);
      }
  }));
}

passport.serializeUser((user: Express.User, done: (error: any, id?: any) => void) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done: (error: any, user?: any) => void) => {
  done(null, obj);
});

declare global {
  namespace Express {
      interface User {
          displayName?: string;
          [key: string]: any;
      }
  }
}

app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Home Page</h1><a href="/auth/facebook">Login with Facebook</a>');
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req: Request, res: Response) => {
      res.redirect('/dashboard');
  });

app.get('/dashboard', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
      return res.redirect('/');
  }
  res.send(`<h1>Welcome ${req.user?.displayName}</h1><a href="/logout">Logout</a>`);
});

app.get('/logout', (req: Request, res: Response, next: any) => {
  req.logout((err: Error) => {
      if (err) {
          return next(err);
      }
      res.redirect('/');
  });
});


// end fb passport

// <script>
//   window.fbAsyncInit = function() {
//     FB.init({
//       appId      : '{your-app-id}',
//       cookie     : true,
//       xfbml      : true,
//       version    : '{api-version}'
//     });
      
//     FB.AppEvents.logPageView();   
      
//   };

//   (function(d, s, id){
//      var js, fjs = d.getElementsByTagName(s)[0];
//      if (d.getElementById(id)) {return;}
//      js = d.createElement(s); js.id = id;
//      js.src = "https://connect.facebook.net/en_US/sdk.js";
//      fjs.parentNode.insertBefore(js, fjs);
//    }(document, 'script', 'facebook-jssdk'));
// </script>



// FB.getLoginStatus(function(response) {
//   statusChangeCallback(response);
// });




// {
//   status: 'connected',
//   authResponse: {
//       accessToken: '...',
//       expiresIn:'...',
//       signedRequest:'...',
//       userID:'...'
//   }
// }


// <fb:login-button 
//   scope="public_profile,email"
//   onlogin="checkLoginState();">
// </fb:login-button>



// function checkLoginState() {
//   FB.getLoginStatus(function(response) {
//     statusChangeCallback(response);
//   });
// }


// AppSecret
// 42ce122ef00f772176c451aff62f8b32

// App ID
// 1066645421807260


// Property routes
// app.get('/properties', async (req, res) => {
//   const properties = await propertyService.getAllProperties();
//   res.json(properties);
// });

// app.get('/properties/:id', async (req, res) => {
//   const id = parseInt(req.params.id);
//   const property = await propertyService.getPropertyById(id);
//   if (property) {
//     res.json(property);
//   } else {
//     res.status(404).json({ error: 'Property not found' });
//   }
// });

// app.post('/properties', async (req, res) => {
//   const property = await propertyService.createProperty(req.body);
//   res.json(property);
// });

// app.put('/properties/:id', async (req, res) => {
//   const id = parseInt(req.params.id);
//   const updatedProperty = await propertyService.updateProperty(id, req.body);
//   if (updatedProperty) {
//     res.json(updatedProperty);
//   } else {
//     res.status(404).json({ error: 'Property not found' });
//   }
// });

// app.delete('/properties/:id', async (req, res) => {
//   const id = parseInt(req.params.id);
//   await propertyService.deleteProperty(id);
//   res.json({ message: 'Property deleted successfully' });
// });

app.get('/resize', async (req: Request, res: Response, next:any) => {
  const { width, height, imagePath } = req.query;

  if (!width || !height || !imagePath) {
     res.status(400).send('Missing required query parameters: width, height, imagePath');
  }

  const parsedWidth = parseInt(width as string, 10);
  const parsedHeight = parseInt(height as string, 10);
  const __dirname = path.resolve(path.dirname(''));
  const imageFullPath = path.resolve(__dirname, '.', imagePath as string);
  if (!fs.existsSync(imageFullPath)) {
     res.status(404).send('Image not found imageFullPath');
     next();
  }
  try {
    const resizedImageBuffer = await sharp(imageFullPath)
      .resize(parsedWidth, parsedHeight)
      .toBuffer();
    const extension = path.extname(imagePath as string).substring(1);
    res.set('Content-Type', extension);
    res.send(resizedImageBuffer);
  } catch (error: any) {
    throw new Error("Exception happened when resizing image", error);
  }
});

app.use((err:Error, req:Request, res:Response, next:any) => {
  console.error(err);
  res.status(500).send('Something broke!');
  next(err);
})

// Agent routes
// Similar to property routes, you can define routes for agents

export const server = app.listen(PORT, () => {
  console.log(`Server is running with Dimon:) on http://localhost:${PORT}`);
  console.log(`Press CTRL+C to stop the server`);
});



export default app;
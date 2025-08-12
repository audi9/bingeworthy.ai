# 🚀 Deployment Guide for bingeworthy.ai

This guide covers multiple deployment options for your movie and TV show recommendation platform.

## 📋 Prerequisites

Before deploying, you'll need to obtain API keys from these free services:

### Required API Keys

1. **TMDB API Key** (Free - 1000 requests/day)
   - Visit: https://www.themoviedb.org/settings/api
   - Sign up for a free account
   - Request an API key
   - No expiration, completely free

2. **Hugging Face API Key** (Free tier available)
   - Visit: https://huggingface.co/settings/tokens
   - Create a free account
   - Generate a new token
   - Free tier: 1000 requests/month

3. **Groq API Key** (Optional - Free tier)
   - Visit: https://console.groq.com/keys
   - Sign up for free account
   - Generate API key
   - Free tier: 14,400 requests/day

4. **OpenAI API Key** (Optional - $5 free credit)
   - Visit: https://platform.openai.com/api-keys
   - Create account and add payment method
   - Get $5 in free credits

## 🌐 Deployment Options

### Option 1: Vercel (Recommended - Free Tier Available)

Vercel is the easiest way to deploy Next.js applications with zero configuration.

#### Steps:

1. **Push to GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/bingeworthy-ai.git
   git push -u origin main
   \`\`\`

2. **Deploy to Vercel**
   - Visit https://vercel.com
   - Sign up with your GitHub account
   - Click "New Project"
   - Import your repository
   - Vercel will auto-detect Next.js and configure everything

3. **Add Environment Variables**
   In your Vercel dashboard, go to Settings > Environment Variables and add:
   \`\`\`
   TMDB_API_KEY=your_tmdb_api_key
   HUGGINGFACE_API_KEY=your_huggingface_key
   GROQ_API_KEY=your_groq_key (optional)
   OPENAI_API_KEY=your_openai_key (optional)
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password
   JWT_SECRET=your_random_jwt_secret
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   \`\`\`

4. **Database Setup**
   - For production, use Vercel's PostgreSQL integration
   - Or use free services like Supabase or Neon
   - Add DATABASE_URL to environment variables

#### Vercel Free Tier Limits:
- 100GB bandwidth/month
- 1000 serverless function invocations/day
- Perfect for personal projects and testing

### Option 2: Docker Deployment

Use Docker for consistent deployment across any platform.

#### Steps:

1. **Build Docker Image**
   \`\`\`bash
   docker build -t bingeworthy-ai .
   \`\`\`

2. **Run with Docker Compose**
   \`\`\`bash
   # Create .env file with your API keys
   cp .env.example .env
   # Edit .env with your actual keys
   
   # Start all services
   docker-compose up -d
   \`\`\`

3. **Access Application**
   - App: http://localhost:3000
   - Database: localhost:5432
   - Redis: localhost:6379

### Option 3: Railway (Free Tier)

Railway offers free hosting with PostgreSQL included.

#### Steps:

1. **Connect GitHub**
   - Visit https://railway.app
   - Sign up with GitHub
   - Create new project from GitHub repo

2. **Add Environment Variables**
   Same as Vercel setup above

3. **Database**
   - Railway provides free PostgreSQL
   - Automatically sets DATABASE_URL

#### Railway Free Tier:
- $5 credit/month (usually enough for small apps)
- Includes PostgreSQL database
- Auto-scaling

### Option 4: Netlify (Static Export)

For a static version without server-side features.

#### Steps:

1. **Configure Next.js for Static Export**
   \`\`\`javascript
   // next.config.mjs
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true
     }
   }
   export default nextConfig
   \`\`\`

2. **Build and Deploy**
   \`\`\`bash
   npm run build
   # Upload 'out' folder to Netlify
   \`\`\`

## 🗄️ Database Setup

### For Production (PostgreSQL)

1. **Create Tables**
   Run the SQL scripts in order:
   \`\`\`bash
   # Connect to your PostgreSQL database
   psql $DATABASE_URL
   
   # Run setup scripts
   \i scripts/01-setup-database.sql
   \i scripts/02-setup-caching.sql
   \`\`\`

2. **Verify Setup**
   \`\`\`sql
   \dt  -- List all tables
   SELECT COUNT(*) FROM content;  -- Should return 0 initially
   \`\`\`

### For Development (SQLite)

SQLite files are automatically created when the app starts.

## 🔧 Environment Variables Reference

Create a `.env.local` file in your project root:

\`\`\`bash
# API Keys
TMDB_API_KEY=your_tmdb_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_token_here
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here

# Database
DATABASE_URL=postgresql://user:password@host:port/database
# For local development with SQLite:
# DATABASE_URL=file:./dev.db

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_random_jwt_secret_minimum_32_characters

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
\`\`\`

## 🚨 Security Checklist

Before deploying to production:

- [ ] Change default admin password
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS (automatic with Vercel/Railway)
- [ ] Set up proper CORS policies
- [ ] Review API rate limiting
- [ ] Monitor API usage and costs

## 📊 Monitoring & Analytics

### Free Monitoring Options:

1. **Vercel Analytics** (Free tier)
   - Built-in performance monitoring
   - User analytics

2. **Sentry** (Free tier)
   - Error tracking
   - Performance monitoring
   - 5,000 errors/month free

3. **LogRocket** (Free tier)
   - Session replay
   - 1,000 sessions/month free

## 🔄 CI/CD Pipeline

### GitHub Actions (Free for public repos)

Create `.github/workflows/deploy.yml`:

\`\`\`yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
\`\`\`

## 🆘 Troubleshooting

### Common Issues:

1. **API Rate Limits**
   - TMDB: 40 requests/10 seconds
   - Implement caching to reduce API calls

2. **Database Connection**
   - Check DATABASE_URL format
   - Ensure database is accessible from your deployment

3. **Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names

4. **Build Errors**
   - Check Node.js version compatibility
   - Clear `.next` folder and rebuild

### Getting Help:

- Check the console for error messages
- Review deployment logs in your platform dashboard
- Test API endpoints individually
- Verify database connectivity

## 💰 Cost Estimation

### Free Tier Deployment:
- **Vercel**: Free (hobby projects)
- **Database**: Supabase/Neon free tier
- **APIs**: All free tiers
- **Total**: $0/month

### Production Deployment:
- **Vercel Pro**: $20/month
- **Database**: $10-25/month
- **API costs**: $5-20/month
- **Total**: $35-65/month

## 🎯 Performance Optimization

1. **Enable caching** for API responses
2. **Use CDN** for static assets
3. **Implement pagination** for large result sets
4. **Optimize images** with Next.js Image component
5. **Monitor Core Web Vitals**

Your bingeworthy.ai platform is now ready for deployment! Choose the option that best fits your needs and budget.

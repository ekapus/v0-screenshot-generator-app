# AWS Lambda Deployment - Quick Reference

## One-Line Deployment

```bash
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

## Key Files

| File | Purpose |
|------|---------|
| `template.yaml` | SAM CloudFormation template |
| `samconfig.toml` | SAM deployment configuration |
| `lambda/screenshot.js` | Lambda handler code |
| `lambda/package.json` | Lambda dependencies |
| `scripts/deploy.sh` | Automated deployment script |
| `scripts/create-chromium-layer.sh` | Create Chromium Lambda layer |
| `DEPLOYMENT.md` | Detailed deployment guide |

## Common Commands

### Deploy
```bash
./scripts/deploy.sh
```

### Local Testing
```bash
sam local start-api  # Terminal 1
curl "http://localhost:3000/screenshot?url=https://example.com" -o test.png  # Terminal 2
```

### View Logs
```bash
./scripts/deploy.sh logs
```

### Get API Endpoint
```bash
./scripts/deploy.sh outputs
```

### Delete
```bash
./scripts/deploy.sh delete
```

## Configuration

### Update Environment Variables

Edit `template.yaml` Globals section:
```yaml
Globals:
  Function:
    Timeout: 60        # Max 900 seconds
    MemorySize: 1024   # Max 10,240 MB
```

### Update Allowed Hostnames

Edit `samconfig.toml`:
```toml
parameter_overrides = "AllowedHostnames=\"domain1.com,domain2.com\""
```

## Troubleshooting Checklist

- [ ] AWS CLI installed: `aws --version`
- [ ] SAM CLI installed: `sam --version`
- [ ] AWS credentials configured: `aws configure`
- [ ] Chromium layer attached to function
- [ ] Allowed hostnames configured correctly
- [ ] Function timeout set appropriately (60+ seconds)
- [ ] Memory allocated (1024+ MB recommended)

## API Endpoint

After deployment, use this format:

```
https://[API_ID].execute-api.[REGION].amazonaws.com/prod/screenshot?url=https://example.com
```

Get the endpoint:
```bash
./scripts/deploy.sh outputs
```

## Cost Monitor

Check Lambda costs in AWS Console:
1. CloudWatch → Billing → Cost Explorer
2. Select Lambda as the service
3. View usage patterns

## Support

For issues:
1. Check logs: `./scripts/deploy.sh logs`
2. Review DEPLOYMENT.md troubleshooting section
3. Check AWS CloudFormation events: `aws cloudformation describe-stack-events --stack-name screenshot-generator`

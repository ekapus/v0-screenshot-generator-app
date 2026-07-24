# AWS Credentials Setup Guide

## Where to Get Your AWS Credentials

### Step 1: Sign in to AWS Console
1. Go to [AWS Management Console](https://console.aws.amazon.com)
2. Sign in with your AWS account credentials

### Step 2: Navigate to IAM
1. Search for "IAM" in the AWS Console search bar
2. Click on "IAM" (Identity and Access Management)
3. Or go directly to: https://console.aws.amazon.com/iam

### Step 3: Create or Use Existing User
1. In the left navigation, click "Users"
2. Either:
   - Click "Create user" to create a new user for deployment (recommended)
   - Select an existing user

### Step 4: Create Access Key
1. Click on the user name to open their details
2. Go to the "Security credentials" tab
3. Scroll down to "Access keys"
4. Click "Create access key"
5. Select "Command Line Interface (CLI)" as the use case
6. Confirm the warning and click "Next"
7. Click "Create access key"

### Step 5: Copy Your Credentials
**IMPORTANT:** You can only see the Secret Access Key ONE TIME!
1. Copy the "Access Key ID" (starts with AKIA)
2. Copy the "Secret Access Key" 
3. Store them somewhere safe - you'll need them for the deployment wizard

## Credential Format Requirements

### Access Key ID
- **Length:** 20 characters
- **Format:** Starts with `AKIA` followed by 16 alphanumeric characters
- **Example:** `AKIAIOSFODNN7EXAMPLE`

### Secret Access Key
- **Length:** 40+ characters
- **Format:** Random alphanumeric string
- **Example:** `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

## Required Permissions

Your IAM user needs the following permissions to deploy the Lambda function:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "apigateway:*",
        "iam:PassRole",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "s3:CreateBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

### To Add These Permissions:
1. In the IAM User Details page
2. Click "Add permissions" → "Attach policies directly"
3. Create an inline policy with the above JSON, or
4. Attach these managed policies:
   - `CloudFormationFullAccess`
   - `AWSLambdaFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `AmazonS3FullAccess`
   - And ensure `iam:PassRole` is included

## Troubleshooting

### "Invalid AWS Access Key ID"
- Double-check you copied the Access Key ID correctly
- Ensure there are no extra spaces
- The Access Key ID should start with "AKIA"
- The Access Key may have been deleted - create a new one

### "Invalid AWS Secret Access Key"
- You can only see the Secret Access Key once when it's created
- If you don't have it, delete the access key and create a new one
- Ensure there are no extra spaces when pasting

### "AWS CLI is not installed"
- Install AWS CLI v2: https://aws.amazon.com/cli/
- After installing, verify with: `aws --version`
- The deployment wizard will work without AWS CLI - it will validate during deployment

### "UnrecognizedClientException"
- Your AWS account or region may not be recognized
- Verify your credentials are correct
- Try a different AWS region from the dropdown

### Still Getting "Unknown error"?

The new improved error logging will help diagnose the issue:

1. **Check the detailed logs** in the deployment monitor - look for specific error messages
2. **Look for one of these common issues:**
   - Access Key ID doesn't start with "AKIA"
   - Secret Access Key is too short
   - Credentials have been deleted from your AWS account
   - IAM user doesn't have required permissions
   - AWS region is not accessible

3. **If logs show credential validation passed**, the issue is likely with:
   - AWS CLI not being installed on the deployment machine
   - SAM CLI not being installed
   - Missing required IAM permissions

4. **Contact AWS Support** if:
   - Your credentials are definitely correct
   - Your IAM user has all required permissions
   - The error persists after trying the above steps

## Security Best Practices

1. **Use a dedicated IAM user** - Don't use your root AWS account credentials
2. **Use an IAM role if possible** - For production, use temporary credentials via IAM roles
3. **Rotate credentials regularly** - Delete old access keys and create new ones
4. **Store securely** - Use a password manager or secure vault
5. **Don't commit to Git** - Never check credentials into version control
6. **Delete unused keys** - Remove access keys you're no longer using
7. **Monitor usage** - Check CloudTrail logs for your access key activity

## Checking Access Key Activity

1. Go to IAM → Users → Select your user
2. Click on the Access Key ID
3. View the last used date and activity
4. Delete the key if you're no longer using it

## Creating a Least-Privilege User (Recommended)

For maximum security, create a dedicated user with only the permissions needed:

1. Go to IAM → Users → Create user
2. Give it a name like `lambda-deployer`
3. Don't add any user groups
4. Click "Create user"
5. Go to Security credentials tab
6. Create access key (for CLI)
7. Go to Permissions tab
8. Click "Add permissions" → "Create inline policy"
9. Paste the required permissions JSON above
10. Save the policy

This user will only be able to deploy the Lambda function and nothing else.

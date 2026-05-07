import { serialize } from 'cookie';

export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Missing code parameter' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'GitHub OAuth credentials not configured' });
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('GitHub OAuth Error:', data);
            return res.redirect('/?error=oauth_failed');
        }

        const accessToken = data.access_token;

        // Set token in HTTP-only secure cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        };

        res.setHeader('Set-Cookie', serialize('github_token', accessToken, cookieOptions));

        // Redirect back to the app
        res.redirect('/');
    } catch (err) {
        console.error('Error during OAuth callback:', err);
        res.redirect('/?error=internal_server_error');
    }
}

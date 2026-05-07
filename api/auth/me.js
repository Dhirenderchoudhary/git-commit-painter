import { parse } from 'cookie';

export default async function handler(req, res) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.github_token;

    if (!token) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'git-commit-painter-app'
            }
        });

        if (!response.ok) {
            return res.status(401).json({ authenticated: false });
        }

        const data = await response.json();

        return res.status(200).json({
            authenticated: true,
            username: data.login,
            avatar_url: data.avatar_url
        });
    } catch (err) {
        console.error('Error fetching user info:', err);
        return res.status(500).json({ error: 'Failed to fetch user info' });
    }
}

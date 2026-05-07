import { serialize } from 'cookie';

export default function handler(req, res) {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: -1 // Expire immediately
    };

    res.setHeader('Set-Cookie', serialize('github_token', '', cookieOptions));
    res.redirect('/');
}

import { parse } from 'cookie';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

const DAYS_PER_WEEK = 7;

function interpolate(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMax;
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookies = parse(req.headers.cookie || '');
    const token = cookies.github_token;

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { pattern, username, repo, startdate, multiplier = 10, invert = false } = req.body;

    if (!pattern || !username || !repo || !startdate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare dates
    let startEpoch;
    try {
        const originDate = new Date(startdate);
        if (isNaN(originDate.getTime())) throw new Error();
        // Snap to Sunday
        const day = originDate.getDay();
        const diff = originDate.getDate() - day;
        const sunday = new Date(originDate.setDate(diff));
        sunday.setHours(12, 0, 0, 0);
        startEpoch = Math.floor(sunday.getTime() / 1000);
    } catch {
        return res.status(400).json({ error: 'Invalid startdate format. Use YYYY-MM-DD' });
    }

    try {
        // Create a unique temporary directory
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const dirName = path.join(os.tmpdir(), `painted-${uniqueId}`);
        
        fs.mkdirSync(dirName, { recursive: true });
        
        // Check if git is available
        try {
            execSync('git --version');
        } catch {
            return res.status(500).json({ error: 'Git binary not found on the server.' });
        }

        // Initialize Git repo
        execSync(`git -C ${dirName} init`);
        execSync(`git -C ${dirName} config user.name "${username}"`);
        // Using a dummy email as github matches by author email or username if connected
        // It's better to use the GitHub provided noreply email for exact matching if possible,
        // but typically any email works if the commit is pushed via token of that user
        execSync(`git -C ${dirName} config user.email "${username}@users.noreply.github.com"`);

        let grid = JSON.parse(JSON.stringify(pattern));
        
        // Remove trailing empty weeks
        while (grid.length > 0 && grid.every(row => row[row.length - 1] === '0')) {
            for (let i = 0; i < grid.length; i++) {
                grid[i] = grid[i].slice(0, -1);
            }
        }
        
        // Convert to numbers
        grid = grid.map(row => row.split('').map(Number));

        const totalWeeks = Math.max(...grid.map(row => row.length));
        
        if (invert) {
            const peak = Math.max(...grid.flat());
            grid = grid.map(row => row.map(cell => peak - cell));
        }

        let totalCommits = 0;
        let epoch = startEpoch;

        for (let week = 0; week < totalWeeks; week++) {
            for (let day = 0; day < DAYS_PER_WEEK; day++) {
                const intensity = (grid[day]?.[week] || 0) * multiplier;
                
                // Cap intensity to prevent Vercel timeout (e.g. max 20 commits per day = ~7000 commits per year)
                const safeIntensity = Math.min(intensity, 20);

                for (let c = 0; c < safeIntensity; c++) {
                    execSync(`git -C ${dirName} commit --allow-empty --date="${epoch}" -am 'git-commit-painter'`);
                    totalCommits++;
                }
                epoch += 86400; // Next day
            }
        }

        // Push to GitHub using OAuth token
        // URL format: https://oauth2:${token}@github.com/${username}/${repo}.git
        const remoteUrl = `https://oauth2:${token}@github.com/${username}/${repo}.git`;
        
        execSync(`git -C ${dirName} remote add origin ${remoteUrl}`);
        
        // We do a force push to ensure the new history overwrites whatever might be there
        // Note: The UI should warn the user they are overwriting the repo!
        execSync(`git -C ${dirName} push --force -u origin main || git -C ${dirName} push --force -u origin master`);

        // Clean up tmp dir
        fs.rmSync(dirName, { recursive: true, force: true });

        return res.status(200).json({ 
            success: true, 
            commits: totalCommits,
            message: `Successfully generated ${totalCommits} commits and pushed to ${username}/${repo}`
        });

    } catch (err) {
        console.error('Error during git operations:', err);
        return res.status(500).json({ error: 'Failed to generate or push commits', details: err.message });
    }
}

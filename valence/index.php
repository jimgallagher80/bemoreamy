<?php
declare(strict_types=1);
session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = $_SESSION['csrf_token'];

header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$institutions = [
    'University of Edinburgh',
    'Edinburgh Napier University',
    'Heriot-Watt University',
    'Queen Margaret University',
    'Edinburgh College',
    'University of Glasgow',
    'University of Strathclyde',
    'Glasgow Caledonian University',
    'Glasgow School of Art',
    'Royal Conservatoire of Scotland',
    'City of Glasgow College',
    'Glasgow Clyde College',
    'Glasgow Kelvin College',
    'Other',
    'Not currently a student',
];
?>
<!doctype html>
<html lang="en-GB">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#320256">
    <meta name="description" content="Valence — meaningful connections. Real chemistry. Register your interest in our upcoming launch.">
    <title>Valence — Meaningful connections. Real chemistry.</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <main>
        <section class="hero" id="home" aria-labelledby="hero-title">
            <div class="hero-inner">
                <img class="logo" src="assets/valence-logo.PNG" alt="Valence" width="1200" height="600">
                <h1 id="hero-title" class="sr-only">Valence</h1>
                <p class="tagline">Meaningful connections. Real chemistry.</p>
                <nav class="hero-actions" aria-label="Main navigation">
                    <a class="button button-primary" href="#register">Register interest</a>
                    <a class="button button-secondary" href="#about">About</a>
                    <a class="button button-secondary" href="#invest">Invest?</a>
                </nav>
            </div>
        </section>

        <section class="section" id="register" aria-labelledby="register-title">
            <div class="content narrow">
                <p class="eyebrow">Be there from the beginning</p>
                <h2 id="register-title">Register your interest</h2>
                <p class="intro">We’re building Valence — a new approach to meeting people, designed around genuine connection and real chemistry.</p>

                <div class="age-note">
                    <strong>18+ only.</strong> There is no age-verification check at this early-interest stage. When Valence launches, all users will be required to complete age verification before using the service.
                </div>

                <form id="interest-form" action="register.php" method="post" novalidate>
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
                    <div class="honeypot" aria-hidden="true">
                        <label for="website">Website</label>
                        <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
                    </div>

                    <div class="form-grid">
                        <div class="field">
                            <label for="first_name">First name</label>
                            <input id="first_name" name="first_name" type="text" maxlength="80" autocomplete="given-name" required>
                        </div>

                        <div class="field">
                            <label for="email">Email address</label>
                            <input id="email" name="email" type="email" maxlength="254" autocomplete="email" inputmode="email" required>
                        </div>

                        <div class="field">
                            <label for="age">Age</label>
                            <input id="age" name="age" type="number" min="18" max="120" inputmode="numeric" required>
                        </div>

                        <div class="field">
                            <label for="postcode_area">Postcode area</label>
                            <input id="postcode_area" name="postcode_area" type="text" maxlength="4" autocomplete="postal-code" placeholder="e.g. EH3" autocapitalize="characters" required>
                            <small>First part only — not your full postcode.</small>
                        </div>

                        <div class="field full">
                            <label for="institution">University or college</label>
                            <select id="institution" name="institution" required>
                                <option value="" selected disabled>Select your institution</option>
                                <?php foreach ($institutions as $institution): ?>
                                    <option value="<?= htmlspecialchars($institution, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($institution, ENT_QUOTES, 'UTF-8') ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="field full hidden" id="other-institution-wrap">
                            <label for="other_institution">Institution name</label>
                            <input id="other_institution" name="other_institution" type="text" maxlength="160">
                        </div>
                    </div>

                    <label class="checkbox-row">
                        <input type="checkbox" name="marketing_consent" value="1">
                        <span>I’d like to receive occasional emails from Valence about the launch, early access and updates.</span>
                    </label>

                    <p class="privacy-short">We’ll use your details to record and understand interest in Valence. If you opt in above, we’ll also use your email to send occasional launch updates. We won’t sell your information. See our <a href="privacy.php">Privacy Notice</a>.</p>

                    <button class="button button-light submit-button" type="submit">Register my interest</button>
                    <div class="form-message" id="form-message" role="status" aria-live="polite"></div>
                </form>
            </div>
        </section>

        <section class="section section-alt" id="about" aria-labelledby="about-title">
            <div class="content narrow">
                <p class="eyebrow">A different starting point</p>
                <h2 id="about-title">About</h2>
                <p class="large-copy">Valence is a new way to meet people that puts genuine connection ahead of endless profiles and superficial swiping. We’re building something designed to make meeting someone feel more natural, more meaningful and, ultimately, more human.</p>
                <p class="large-copy">We’re keeping the finer details under wraps for now. But if you believe dating could be better, we think you’ll like what we’re building.</p>
            </div>
        </section>

        <section class="section" id="invest" aria-labelledby="invest-title">
            <div class="content narrow">
                <p class="eyebrow">Looking further ahead</p>
                <h2 id="invest-title">Invest?</h2>
                <p class="large-copy"><strong>Not yet.</strong> We’re not currently seeking investment. Our intention is to build Valence independently, launch it ourselves and prove the concept before bringing outside investors on board.</p>
                <p class="large-copy">Our initial launch will focus on university communities in Edinburgh and Glasgow, allowing us to test, learn and demonstrate the model in defined, highly connected markets. Once we’ve established that proof of concept, we expect to explore investment to accelerate national growth across the UK and, ultimately, international expansion — with the United States likely to be our first major overseas market.</p>
                <p class="large-copy">If you’re interested in Valence from an investment perspective and would like to follow our progress, email <a class="inline-link" href="mailto:james@valence.love">james@valence.love</a>.</p>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="socials" aria-label="Valence social media">
            <a href="https://www.facebook.com/valence.love" aria-label="Valence on Facebook" target="_blank" rel="noopener noreferrer"><img src="assets/facebook.png" alt="" width="28" height="28"></a>
            <a href="https://x.com/valencelove" aria-label="Valence on X" target="_blank" rel="noopener noreferrer"><img src="assets/x.png" alt="" width="28" height="28"></a>
            <a href="https://www.instagram.com/valence.love" aria-label="Valence on Instagram" target="_blank" rel="noopener noreferrer"><img src="assets/instagram.png" alt="" width="28" height="28"></a>
        </div>
        <p><a href="privacy.php">Privacy</a> <span aria-hidden="true">·</span> <a href="mailto:james@valence.love">Contact</a></p>
        <p class="copyright">&copy; <?= date('Y') ?> Valence. All rights reserved.</p>
    </footer>

    <script src="assets/site.js" defer></script>
</body>
</html>

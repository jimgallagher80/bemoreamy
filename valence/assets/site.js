(() => {
    const form = document.getElementById('interest-form');
    const message = document.getElementById('form-message');
    const institution = document.getElementById('institution');
    const otherWrap = document.getElementById('other-institution-wrap');
    const otherInput = document.getElementById('other_institution');

    institution?.addEventListener('change', () => {
        const isOther = institution.value === 'Other';
        otherWrap.classList.toggle('hidden', !isOther);
        otherInput.required = isOther;
        if (!isOther) otherInput.value = '';
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        message.textContent = '';
        message.className = 'form-message';

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registering…';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Something went wrong. Please try again.');
            }

            form.querySelectorAll('input:not([type="hidden"]), select').forEach((field) => {
                if (field.type === 'checkbox') field.checked = false;
                else field.value = '';
            });
            otherWrap.classList.add('hidden');
            otherInput.required = false;
            message.textContent = data.message;
            message.classList.add('success');
            submitButton.textContent = 'Registered';
        } catch (error) {
            message.textContent = error.message;
            message.classList.add('error');
            submitButton.disabled = false;
            submitButton.textContent = 'Register my interest';
        }
    });
})();

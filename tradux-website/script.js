// ===== Configuration =====
// API URL - points to Legacy Portal backend
const API_URL = 'https://legacy-portal.onrender.com/api';

// ===== Mobile Menu Toggle =====
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        const icon = mobileMenuBtn.querySelector('i');
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
    });
});

// ===== FAQ Accordion =====
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        // Close other items
        faqItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('active')) {
                otherItem.classList.remove('active');
            }
        });

        // Toggle current item
        item.classList.toggle('active');
    });
});

// ===== File Upload & Word Count System =====
const fileInput = document.getElementById('document');
const fileName = document.getElementById('fileName');
let uploadedFiles = [];
let totalWordCount = 0;

// Price configuration (same as Legacy Portal)
const PRICES = {
    certified: { perPage: 24.99, name: 'Certified Translation' },
    technical: { perPage: 21.99, name: 'Technical Translation' },
    standard: { perWord: 0.09, name: 'Standard Translation' },
    express: { perPage: 40.00, name: 'Express Translation' }
};
const WORDS_PER_PAGE = 250;

if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length === 0) {
            fileName.textContent = 'No file chosen';
            return;
        }

        fileName.textContent = 'Processing...';

        for (const file of files) {
            try {
                const result = await uploadDocument(file);
                if (result) {
                    uploadedFiles.push(result);
                    totalWordCount += result.wordCount;
                }
            } catch (error) {
                console.error('Upload error:', error);
            }
        }

        updateFileDisplay();
        updateQuoteEstimate();
    });
}

async function uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_URL}/upload-document`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return {
            fileName: data.filename,
            wordCount: data.word_count,
            documentId: data.document_id,
            fileSize: data.file_size
        };
    } catch (error) {
        console.error('Error uploading document:', error);
        // Fallback: estimate word count locally if API fails
        return {
            fileName: file.name,
            wordCount: await estimateWordCountLocally(file),
            documentId: null,
            fileSize: file.size
        };
    }
}

async function estimateWordCountLocally(file) {
    // Simple fallback for text files
    if (file.type === 'text/plain') {
        const text = await file.text();
        return text.split(/\s+/).filter(w => w.length > 0).length;
    }
    // For other files, estimate based on file size (rough estimate)
    // Assume 1 page = 250 words, average file size per page ~50KB
    return Math.ceil(file.size / 50000) * 250;
}

function updateFileDisplay() {
    if (uploadedFiles.length === 0) {
        fileName.textContent = 'No file chosen';
        return;
    }

    const fileList = uploadedFiles.map(f =>
        `${f.fileName} (${f.wordCount} words)`
    ).join(', ');

    const pages = Math.ceil(totalWordCount / WORDS_PER_PAGE);
    fileName.innerHTML = `
        <strong>${uploadedFiles.length} file(s) uploaded</strong><br>
        <small>${fileList}</small><br>
        <span class="word-count-badge">Total: ${totalWordCount} words (${pages} page${pages !== 1 ? 's' : ''})</span>
    `;
}

function updateQuoteEstimate() {
    const translationType = document.getElementById('translationType');
    if (!translationType) return;

    const type = translationType.value;
    if (!type || !PRICES[type]) return;

    const pages = Math.ceil(totalWordCount / WORDS_PER_PAGE);
    let estimate = 0;

    if (type === 'standard') {
        estimate = totalWordCount * PRICES.standard.perWord;
    } else {
        estimate = pages * PRICES[type].perPage;
    }

    // Show estimate if we have a quote display element
    const estimateDisplay = document.getElementById('quoteEstimate');
    if (estimateDisplay) {
        if (estimate > 0) {
            estimateDisplay.style.display = 'block';
            estimateDisplay.innerHTML = `<strong>Estimated Total: $${estimate.toFixed(2)}</strong>`;
        } else {
            estimateDisplay.style.display = 'none';
        }
    }
}

// Update estimate when translation type changes
const translationTypeSelect = document.getElementById('translationType');
if (translationTypeSelect) {
    translationTypeSelect.addEventListener('change', updateQuoteEstimate);
}

// ===== Form Submission with Stripe Integration =====
const quoteForm = document.getElementById('quoteForm');

if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = quoteForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(quoteForm);
            const data = Object.fromEntries(formData.entries());

            // Validate required fields
            if (!data.fullName || !data.email || !data.translationType) {
                throw new Error('Please fill in all required fields');
            }

            if (totalWordCount === 0) {
                throw new Error('Please upload a document');
            }

            // Calculate quote
            const pages = Math.ceil(totalWordCount / WORDS_PER_PAGE);
            const type = data.translationType;
            let basePrice = 0;

            if (type === 'standard') {
                basePrice = totalWordCount * PRICES.standard.perWord;
            } else {
                basePrice = pages * PRICES[type].perPage;
            }

            // Create quote via API
            const quotePayload = {
                reference: `TRADUX-${Date.now()}`,
                service_type: type,
                translate_from: data.fromLanguage || 'portuguese',
                translate_to: data.toLanguage || 'english',
                word_count: totalWordCount,
                urgency: type === 'express' ? 'express' : 'no',
                customer_email: data.email,
                customer_name: data.fullName,
                notes: data.requirements || '',
                document_ids: uploadedFiles.map(f => f.documentId).filter(Boolean),
                shipping_fee: 0,
                discount_amount: 0,
                discount_code: null
            };

            const quoteResponse = await fetch(`${API_URL}/calculate-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotePayload)
            });

            if (!quoteResponse.ok) {
                throw new Error('Failed to calculate quote');
            }

            const quote = await quoteResponse.json();

            // Create Stripe checkout session
            const checkoutResponse = await fetch(`${API_URL}/create-payment-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quote_id: quote.id,
                    success_url: window.location.origin + '/success.html',
                    cancel_url: window.location.origin + '/cancel.html'
                })
            });

            if (!checkoutResponse.ok) {
                throw new Error('Failed to create payment session');
            }

            const checkout = await checkoutResponse.json();

            // Redirect to Stripe Checkout
            if (checkout.checkout_url) {
                window.location.href = checkout.checkout_url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            alert(error.message || 'An error occurred. Please try again.');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// ===== Smooth Scroll for Navigation =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Header Background on Scroll =====
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});

// ===== Animation on Scroll =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Add animation to elements
document.querySelectorAll('.service-card, .process-step, .faq-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// ===== Remove uploaded file =====
function removeFile(index) {
    const removed = uploadedFiles.splice(index, 1)[0];
    totalWordCount -= removed.wordCount;
    updateFileDisplay();
    updateQuoteEstimate();
}

// Make removeFile global so it can be called from onclick
window.removeFile = removeFile;

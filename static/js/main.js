document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS Animation Library
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        mirror: false
    });

    // Header scroll effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    
    mobileMenu.addEventListener('click', function() {
        mobileMenu.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-list li a').forEach(item => {
        item.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Hero Slideshow
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    // Initialize slideshow
    function startSlideshow() {
        slideInterval = setInterval(nextSlide, 5000);
    }
    
    // Click on dots to change slide
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(slideInterval);
            showSlide(index);
            startSlideshow();
        });
    });
    
    startSlideshow();

// Success Stories Slider
const storySlides = document.querySelectorAll('.story-slide');
const storyDots = document.querySelectorAll('.story-dot');
let currentStory = 0;
let storyInterval;

function showStory(index) {
    // Remove active class from all slides and dots
    storySlides.forEach(slide => slide.classList.remove('active'));
    storyDots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current slide and dot
    storySlides[index].classList.add('active');
    storyDots[index].classList.add('active');
    currentStory = index;
}

function nextStory() {
    currentStory = (currentStory + 1) % storySlides.length;
    showStory(currentStory);
}

// Initialize automatic sliding
function startStorySlider() {
    storyInterval = setInterval(nextStory, 5000); // Change slide every 5 seconds
}

// Add click event to story dots
storyDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        clearInterval(storyInterval);
        showStory(index);
        startStorySlider();
    });
});

// Initialize the slider
showStory(0); // Show first story initially
startStorySlider();

    // FAQ Toggle
    document.querySelectorAll('.faq-item').forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const toggle = item.querySelector('.faq-toggle');

        question.addEventListener('click', () => {
            item.classList.toggle('active');
            answer.style.maxHeight = item.classList.contains('active') 
                ? answer.scrollHeight + 'px' 
                : '0';
            
            toggle.innerHTML = item.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-plus"></i>';
        });
    });

    // Back to Top Button
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('active');
        } else {
            backToTop.classList.remove('active');
        }
    });

    backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Smooth Scroll for Navigation Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Form Validation
    const enquiryForm = document.getElementById('enquiryForm');
    enquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Add your form submission logic here
        const formData = new FormData(enquiryForm);
        if (validateForm(formData)) {
            // Submit form
            console.log('Form submitted successfully!');
            enquiryForm.reset();
            showSuccessMessage();
        }
    });

    function validateForm(formData) {
        let isValid = true;
        const fields = ['name', 'email', 'phone', 'message'];
        
        fields.forEach(field => {
            const input = document.getElementById(field);
            if (!formData.get(field)) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }

    function showSuccessMessage() {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>Your message has been sent successfully!</p>
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 100);

        setTimeout(() => {
            successDiv.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(successDiv);
            }, 500);
        }, 3000);
    }

    // Hover Animation for Service Cards
    document.querySelectorAll('.service-item').forEach(service => {
        service.addEventListener('mouseenter', () => {
            service.querySelector('.service-icon').style.transform = 'rotateY(180deg)';
        });
        
        service.addEventListener('mouseleave', () => {
            service.querySelector('.service-icon').style.transform = 'rotateY(0deg)';
        });
    });

    // Parallax Effect for Hero Section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.slide-content');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // Initialize Scroll Reveal Animations
    ScrollReveal().reveal('.feature-card, .service-item, .story-slide', {
        interval: 200,
        reset: true
    });
});
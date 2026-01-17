import { X, Github, Linkedin, Mail, Globe, Twitter, MapPin, GraduationCap } from 'lucide-react';

interface DeveloperModalProps {
  onClose: () => void;
}

export function DeveloperModal({ onClose }: DeveloperModalProps) {
  return (
    <>
      <style>{`
        @keyframes slideUpAndFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal-overlay {
          animation: fadeIn 0.3s ease-out;
        }
        
        .modal-content {
          animation: slideUpAndFade 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @media (min-width: 640px) {
          .modal-content {
            transform: translate(-50%, -50%) !important;
          }
        }
      `}</style>
      
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 modal-overlay"
        onClick={onClose}
      />
      <div 
        className="fixed bottom-0 left-0 right-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto w-full sm:w-[90vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 max-h-[97vh] sm:max-h-[90vh] overflow-y-auto modal-content"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          transform: 'translateX(0)',
        }}
      >
        {/* Handle bar for mobile */}
        <div className="sticky top-0 sm:hidden flex justify-center pt-3 pb-2 bg-white dark:bg-gray-900 rounded-t-3xl">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Close button - Desktop only */}
        <button
          onClick={onClose}
          className="hidden sm:block absolute right-4 sm:right-6 top-4 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors shadow-md z-20"
        >
          <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Hero Section */}
        <div className="relative -mt-12 sm:-mt-14">
          <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-3xl sm:rounded-t-3xl" />
          <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-4 flex justify-center">
            <div className="relative">
              <img
                src="https://avatars.githubusercontent.com/u/113442689?s=400&u=ffb680dccfc0664b39c3990bef4a63c4639c2979&v=4"
                alt="Sheikh Shariar Nehal"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white dark:border-gray-900 shadow-lg object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-3 border-white dark:border-gray-900"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-8 md:px-10 pt-10 sm:pt-14 pb-32 sm:pb-12">
          {/* Basic Info */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Sheikh Shariar Nehal</h1>
            <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400 font-semibold mb-3">Full Stack Developer & UI/UX Designer</p>
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              <MapPin className="w-4 h-4" />
              <span>Dhaka, Bangladesh</span>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-10 sm:mb-12 pb-8 sm:pb-10 border-b border-gray-200 dark:border-gray-700">
            {[
              { icon: Github, href: 'https://github.com/sheikhshariarnehal', label: 'GitHub', color: 'hover:bg-gray-900 dark:hover:bg-gray-700 hover:text-white' },
              { icon: Linkedin, href: 'https://www.linkedin.com/in/sheikhshariarnehal/', label: 'LinkedIn', color: 'hover:bg-blue-600 hover:text-white' },
              { icon: Twitter, href: 'https://twitter.com/SheikhNehal', label: 'Twitter', color: 'hover:bg-blue-400 hover:text-white' },
              { icon: Mail, href: 'mailto:sheikhshariarnehal@gmail.com', label: 'Email', color: 'hover:bg-red-500 hover:text-white' },
              { icon: Globe, href: 'https://www.sheikhshariarnehal.com', label: 'Website', color: 'hover:bg-indigo-600 hover:text-white' }
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2.5 sm:p-3 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg transition-all ${social.color} shadow-sm hover:shadow-md`}
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
            ))}
          </div>

          {/* About */}
          <div className="mb-10 sm:mb-12">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">About Me</h3>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Passionate Full Stack Developer and UI/UX Designer dedicated to crafting elegant, scalable digital solutions. Specializing in modern web technologies and responsive design, I build applications that prioritize user experience and performance.
            </p>
          </div>

          {/* Experience & Education */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 mb-10 sm:mb-12">
            {/* Experience */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-5">Experience</h3>
              <div className="space-y-5">
                {[
                  { role: 'Full Stack Developer', company: 'Freelance', period: '2021 - Present', description: 'Developing scalable web applications using React, Node.js, and modern technologies.' },
                  { role: 'UI/UX Designer', company: 'Various Projects', period: '2020 - Present', description: 'Designing user-centric interfaces for digital products and platforms.' }
                ].map((job, index) => (
                  <div key={index} className="pb-5 border-l-2 border-blue-200 dark:border-blue-900 pl-4 last:border-0 last:pb-0">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{job.role}</h4>
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mt-0.5">{job.company}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{job.period}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">{job.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-5">Education</h3>
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 sm:p-5 border border-blue-200 dark:border-blue-800/50">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">BSc Computer Science</h4>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mt-2">Daffodil International University</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">2020 - Present</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="mb-10 sm:mb-12">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-5">Technical Skills</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Figma', 'TailwindCSS', 'Git', 'REST API'].map((skill) => (
                <span key={skill} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg text-sm sm:text-base"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
"use client";
import Reveal from '../ui/Reveal';
import AnimatedCounter from '../ui/AnimatedCounter';
import { STATS_DATA } from '../../../lib/constants';

const About = ({ theme, isDarkMode }) => {
  return (
    <section id="about" className={`py-24 px-6 ${isDarkMode ? 'bg-slate-900/50' : 'bg-white'}`}>
        <Reveal direction="left">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-blue-500 font-bold text-lg mb-2">من نحن؟</h2>
                    <h3 className={`text-4xl font-black ${theme.textMain}`}>Science Academy</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <p className={`text-lg leading-loose mb-6 ${theme.textSec}`}>
                            إحنا تيم من خريجين و طلبة كلية العلوم، هدفنا نسهل عليك مواد الكلية ونحولها من مواد معقدة لمحتوى شيق ومفهوم. بنوفرلك كل الأدوات اللي تحتاجها للنجاح من شرح مبسط، ومراجعات نهائية، وبنك أسئلة.
                        </p>
                        <ul className={`space-y-4 mb-8 ${theme.textMain}`}>
                            {['✅ شرح مبسط لكل المواد', '✅ متابعة دورية مع الطالب', '✅ امتحانات تفاعلية'].map((item, i)=>(
                                <li key={i} className="font-bold flex items-center gap-2">{item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className={`grid grid-cols-2 gap-6 p-8 rounded-3xl border ${theme.card}`}>
                      {STATS_DATA.map((s, i) => (
                        <AnimatedCounter key={i} value={s.n} label={s.t} />
                      ))}
                    </div>
                </div>
            </div>
        </Reveal>
      </section>
  );
};

export default About;
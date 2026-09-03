export interface ClientConfig {
  name: string;
  title: string;
  photo: string;
  bio: string;
  shortBio: string;
  yearsExperience: number;
  insuredCount: number;
  satisfactionScore: number;
  phone: string;
  email?: string;
  website: string;
  address?: string;
  whatsapp: {
    number: string;
    openerMessage: string;
  };
  telegram: {
    username: string;
  };
}

export const clientConfig: ClientConfig = {
  name: "اردلان نمونه",
  title: "نماینده فروش بیمه عمر",
  photo: "/images/profile-placeholder.jpg",
  bio: "با بیش از ۱۲ سال تجربه در صنعت بیمه عمر، همراه شما در مسیر امنیت مالی خانواده هستم. مشاوره تخصصی و پشتیبانی مستمر، تعهد من به شماست.",
  shortBio: "نماینده فروش بیمه عمر — ۱۲ سال تجربه",
  yearsExperience: 12,
  insuredCount: 800,
  satisfactionScore: 4.9,
  phone: "09123456789",
  website: "https://example.ir",
  address: "تهران، خیابان نمونه",
  whatsapp: {
    number: "989123456789",
    openerMessage: "سلام، درباره بیمه عمر می‌خواستم مشاوره بگیرم.",
  },
  telegram: {
    username: "ardalan_insurance",
  },
};

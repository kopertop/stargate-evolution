import { Button } from "react-bootstrap";

interface NavButtonProps {
	children: React.ReactNode;
	onClick: () => void;
}

export const NavButton: React.FC<NavButtonProps> = ({ children, onClick }) => {
	return (
		<Button
			className="btn btn-link text-light text-decoration-none position-absolute top-0 start-0 m-3"
			style={{ zIndex: 1000 }}
			onClick={onClick}
		>
			{children}
		</Button>
	);
};

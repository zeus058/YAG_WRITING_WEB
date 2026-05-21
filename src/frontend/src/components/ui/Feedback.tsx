type ErrorGuideProps = {
  title: string;
  items: string[];
};

export function ErrorGuide({ title, items }: ErrorGuideProps) {
  return (
    <div className="error-guide">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
